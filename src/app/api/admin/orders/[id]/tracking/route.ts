import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { logActivity } from "@/lib/activity-log";
import { sendEmail, resolveRecipients } from "@/lib/email";
import { createElement } from "react";
import TrackingUpdate from "@/emails/TrackingUpdate";
import { z } from "zod";

const trackingSchema = z.object({
  trackingNumber: z.string().min(1, "Tracking number is required"),
  carrierName: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = trackingSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message || "Invalid tracking data");
    }

    const { trackingNumber, carrierName } = parsed.data;

    // Verify the order exists
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Order not found");
    }

    const data: Record<string, string> = { trackingNumber };
    if (carrierName !== undefined) data.carrierName = carrierName;

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });

    const adminId = session!.user!.id!;
    const adminName = session!.user!.name || session!.user!.email || "Admin";

    // Create order event for tracking update
    try {
      await prisma.orderEvent.create({
        data: {
          orderId: id,
          type: "tracking_added",
          toValue: trackingNumber,
          note: carrierName ? `Carrier: ${carrierName}` : undefined,
          adminId,
          adminName,
        },
      });
    } catch {
      // Non-critical
    }

    await logActivity(
      adminId,
      "order.tracking_update",
      "order",
      id,
      `Tracking updated: ${trackingNumber}${carrierName ? ` (${carrierName})` : ""}`
    );

    // Fire-and-forget tracking email
    resolveRecipients("tracking_update", order.email)
      .then((recipients) =>
        Promise.all(
          recipients.map((to) =>
            sendEmail({
              type: "tracking_update",
              to,
              subject: `Tracking Info for Order #${order.orderNumber}`,
              react: createElement(TrackingUpdate, {
                orderNumber: order.orderNumber,
                firstName: order.firstName,
                trackingNumber,
                carrierName: carrierName || undefined,
              }),
              orderId: order.id,
              userId: order.userId || undefined,
            })
          )
        )
      )
      .catch((e) => console.error("Tracking email error:", e));

    return success(serializeDecimals(order));
  } catch (err) {
    console.error("Admin order tracking update error:", err);
    return serverError();
  }
}

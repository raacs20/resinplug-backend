import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";
import { logActivity } from "@/lib/activity-log";
import { createNotification } from "@/lib/notifications";

const refundSchema = z.object({
  amount: z.number().positive("Refund amount must be positive"),
  reason: z.enum(["customer_request", "defective", "wrong_item", "duplicate", "other"]),
  notes: z.string().optional(),
});

// GET - list refunds for an order
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const refunds = await prisma.refund.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    const serialized = refunds.map((r) => ({
      ...r,
      amount: r.amount.toNumber(),
      createdAt: r.createdAt.toISOString(),
    }));

    return success(serialized);
  } catch (err) {
    console.error("Failed to fetch refunds:", err);
    return serverError("Failed to fetch refunds");
  }
}

// POST - create a refund
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    // Get the order to validate refund amount
    const order = await prisma.order.findUnique({
      where: { id },
      include: { refunds: true },
    });

    if (!order) return badRequest("Order not found");

    const totalRefunded = order.refunds.reduce(
      (sum, r) => sum + r.amount.toNumber(),
      0
    );
    const orderTotal = order.total.toNumber();

    if (totalRefunded + parsed.data.amount > orderTotal) {
      return badRequest(
        `Refund amount exceeds remaining refundable amount ($${(orderTotal - totalRefunded).toFixed(2)})`
      );
    }

    const adminId = session!.user!.id!;
    const adminName = session!.user!.name || session!.user!.email || "Admin";

    const refund = await prisma.refund.create({
      data: {
        orderId: id,
        amount: parsed.data.amount,
        reason: parsed.data.reason,
        notes: parsed.data.notes || null,
        status: "completed",
        processedBy: adminName,
      },
    });

    // Create order event
    try {
      await prisma.orderEvent.create({
        data: {
          orderId: id,
          type: "refund_issued",
          toValue: `$${parsed.data.amount.toFixed(2)}`,
          note: `Reason: ${parsed.data.reason}${parsed.data.notes ? ` - ${parsed.data.notes}` : ""}`,
          adminId,
          adminName,
        },
      });
    } catch {
      // Non-critical: event creation failure should not block refund
    }

    // Log activity
    await logActivity(
      adminId,
      "refund.create",
      "order",
      id,
      `Refund $${parsed.data.amount.toFixed(2)} - ${parsed.data.reason}`
    ).catch(() => {});

    // Create notification
    await createNotification(
      "order_update",
      "Refund Processed",
      `Refund of $${parsed.data.amount.toFixed(2)} issued for order ${order.orderNumber}`,
      `/admin/orders/${id}`
    ).catch(() => {});

    return success({
      ...refund,
      amount: refund.amount.toNumber(),
      createdAt: refund.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Failed to create refund:", err);
    return serverError("Failed to create refund");
  }
}

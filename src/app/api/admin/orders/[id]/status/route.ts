import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { logActivity } from "@/lib/activity-log";
import { sendEmail, resolveRecipients, getEmailContentWithDefaults } from "@/lib/email";
import { createElement } from "react";
import OrderShipped from "@/emails/OrderShipped";
import OrderDelivered from "@/emails/OrderDelivered";
import OrderCancelled from "@/emails/OrderCancelled";
import { z } from "zod";

const VALID_STATUSES = ["processing", "shipped", "in_transit", "delivered", "cancelled"] as const;

const statusSchema = z.object({
  status: z.enum(VALID_STATUSES),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      );
    }

    const { status } = parsed.data;

    // Verify the order exists
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Order not found");
    }

    const previousStatus = existing.status;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    const adminId = session!.user!.id!;
    const adminName = session!.user!.name || session!.user!.email || "Admin";

    // --- Restore stock and refund credits on cancellation ---
    if (status === "cancelled" && previousStatus !== "cancelled") {
      try {
        // Restore stock for each order item
        for (const item of order.items) {
          if (!item.productId) continue;
          const gramsMatch = item.weight.match(/(\d+(?:\.\d+)?)\s*(?:g(?:ram)?s?)?/i);
          const gramsPerUnit = gramsMatch ? parseFloat(gramsMatch[1]) : 0;
          const gramsToRestore = gramsPerUnit * item.quantity;

          if (gramsToRestore > 0) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { totalStockGrams: { increment: gramsToRestore } },
            });
            await prisma.stockMovement.create({
              data: {
                productId: item.productId,
                type: "order_restore",
                quantity: gramsToRestore,
                reason: `Cancelled Order #${order.orderNumber}`,
                reference: order.id,
                adminName,
              },
            });
          }
        }

        // Refund credits if any were used
        if (existing.creditsUsed && Number(existing.creditsUsed) > 0 && existing.userId) {
          const creditsToRefund = Number(existing.creditsUsed);
          // Convert dollar discount back to points (creditsUsed stores dollar amount)
          // Retrieve pointsPerDollar from settings
          let pointsPerDollar = 100;
          try {
            const setting = await prisma.siteSetting.findUnique({
              where: { key: "pointsPerDollar" },
            });
            if (setting) pointsPerDollar = parseFloat(setting.value) || 100;
          } catch {}
          const pointsToRefund = Math.round(creditsToRefund * pointsPerDollar);

          await prisma.$transaction([
            prisma.credit.create({
              data: {
                userId: existing.userId,
                amount: pointsToRefund,
                type: "refund",
                reason: `Cancelled Order #${order.orderNumber}`,
                orderId: order.id,
              },
            }),
            prisma.user.update({
              where: { id: existing.userId },
              data: { creditBalance: { increment: pointsToRefund } },
            }),
          ]);
        }
      } catch (restoreErr) {
        console.error("Stock/credit restore on cancel error:", restoreErr);
        // Don't fail the status update — restoration is best-effort
      }
    }

    // Create order event for status change
    try {
      await prisma.orderEvent.create({
        data: {
          orderId: id,
          type: "status_change",
          fromValue: previousStatus,
          toValue: status,
          adminId,
          adminName,
        },
      });
    } catch {
      // Non-critical: event creation failure should not block status update
    }

    await logActivity(
      adminId,
      "order.status_change",
      "order",
      id,
      `Status changed from ${previousStatus} to ${status}`
    );

    // Fire-and-forget status change email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusEmailMap: Record<string, { type: string; subject: string; template: React.ComponentType<any> }> = {
      shipped: { type: "order_shipped", subject: `Your Order #${order.orderNumber} Has Shipped`, template: OrderShipped },
      delivered: { type: "order_delivered", subject: `Your Order #${order.orderNumber} Has Been Delivered`, template: OrderDelivered },
      cancelled: { type: "order_cancelled", subject: `Order #${order.orderNumber} Cancelled`, template: OrderCancelled },
    };

    const emailConfig = statusEmailMap[status];
    if (emailConfig) {
      getEmailContentWithDefaults(emailConfig.type)
        .then((content) =>
          resolveRecipients(emailConfig.type, order.email).then((recipients) =>
            Promise.all(
              recipients.map((to) =>
                sendEmail({
                  type: emailConfig.type,
                  to,
                  subject: emailConfig.subject,
                  react: createElement(emailConfig.template, {
                    orderNumber: order.orderNumber,
                    firstName: order.firstName,
                    customHeading: content.heading,
                    customBody: content.body,
                    customBody2: content.body2,
                    customButtonText: content.buttonText,
                  }),
                  orderId: order.id,
                  userId: order.userId || undefined,
                })
              )
            )
          )
        )
        .catch((e) => console.error("Status email error:", e));
    }

    return success(serializeDecimals(order));
  } catch (err) {
    console.error("Admin order status update error:", err);
    return serverError();
  }
}

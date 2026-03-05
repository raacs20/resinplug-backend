import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, badRequest, unauthorized, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { createNotification } from "@/lib/notifications";
import { sendEmail, resolveRecipients } from "@/lib/email";
import { createElement } from "react";
import OrderPlaced from "@/emails/OrderPlaced";
import { z } from "zod";

const FREE_SHIPPING_THRESHOLD = 200;
const SHIPPING_COST = 9.99;
const POINTS_PER_DOLLAR = 100; // 100 points = $1 store credit

const orderItemSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().min(1),
  productImage: z.string().min(1),
  weight: z.string().min(1),
  unitPrice: z.number().positive(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Cart cannot be empty"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  street1: z.string().min(1),
  street2: z.string().optional().default(""),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  paymentMethod: z.enum(["card", "etransfer", "applepay"]),
  notes: z.string().optional().default(""),
  rewardPointsUsed: z.number().int().min(0).optional().default(0),
});

function generateOrderNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randPart = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `RP-${datePart}-${randPart}`;
}

/**
 * Parse grams from a weight string like "1 gram", "3 grams", "15 grams", "28 grams", "1g", etc.
 * Returns the numeric gram value or 0 if unparseable.
 */
function parseGramsFromWeight(weight: string): number {
  const match = weight.match(/(\d+(?:\.\d+)?)\s*(?:g(?:ram)?s?)?/i);
  return match ? parseFloat(match[1]) : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { items, rewardPointsUsed, ...orderData } = parsed.data;

    // Calculate totals server-side (never trust client)
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const shippingCost =
      subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

    // Get authenticated user if logged in (optional for guest checkout)
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // --- Validate and apply reward points discount ---
    let creditsDiscount = 0;
    if (rewardPointsUsed > 0) {
      if (!userId) {
        return badRequest("Must be logged in to use reward points");
      }
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });
      if (!userRecord || Number(userRecord.creditBalance) < rewardPointsUsed) {
        return badRequest("Insufficient reward points");
      }
      creditsDiscount = Math.round((rewardPointsUsed / POINTS_PER_DOLLAR) * 100) / 100;
      // Don't let discount exceed the order total
      const maxTotal = subtotal + shippingCost;
      if (creditsDiscount > maxTotal) {
        creditsDiscount = maxTotal;
      }
    }

    const total = subtotal + shippingCost - creditsDiscount;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        subtotal,
        shippingCost,
        total,
        creditsUsed: creditsDiscount > 0 ? creditsDiscount : null,
        firstName: orderData.firstName,
        lastName: orderData.lastName,
        country: orderData.country,
        street1: orderData.street1,
        street2: orderData.street2 || null,
        city: orderData.city,
        province: orderData.province,
        postalCode: orderData.postalCode,
        phone: orderData.phone,
        email: orderData.email,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes || null,
        items: {
          create: items.map((item) => ({
            productId: item.productId || null,
            productName: item.productName,
            productImage: item.productImage,
            weight: item.weight,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // --- Auto stock deduction ---
    // For each order item with a productId, deduct stock from the product
    try {
      for (const item of order.items) {
        if (!item.productId) continue;

        // Try to find the variant's gramsPerUnit first
        const variant = await prisma.variant.findFirst({
          where: {
            productId: item.productId,
            weight: item.weight,
          },
        });

        let gramsToDeduct: number;
        if (variant?.gramsPerUnit) {
          gramsToDeduct = Number(variant.gramsPerUnit) * item.quantity;
        } else {
          // Estimate from weight string
          const gramsPerUnit = parseGramsFromWeight(item.weight);
          gramsToDeduct = gramsPerUnit * item.quantity;
        }

        if (gramsToDeduct > 0) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              totalStockGrams: { decrement: gramsToDeduct },
            },
          });
        }
      }
    } catch (stockErr) {
      // Log but don't fail the order — stock deduction is best-effort
      console.error("Stock deduction error:", stockErr);
    }

    // --- Create "created" OrderEvent ---
    try {
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: "created",
          toValue: "processing",
          note: `Order ${order.orderNumber} created`,
        },
      });
    } catch (eventErr) {
      console.error("OrderEvent creation error:", eventErr);
    }

    // --- Deduct reward points if used ---
    if (rewardPointsUsed > 0 && userId) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.credit.create({
            data: {
              userId,
              amount: rewardPointsUsed,
              type: "spent",
              reason: `Redeemed at checkout - Order #${order.orderNumber}`,
              orderId: order.id,
            },
          });
          await tx.user.update({
            where: { id: userId },
            data: { creditBalance: { decrement: rewardPointsUsed } },
          });
        });
      } catch (spendErr) {
        console.error("Credit spend error:", spendErr);
      }
    }

    // --- Award reward points (1 point per $1 spent, logged-in users only) ---
    if (userId) {
      try {
        const pointsEarned = Math.floor(total); // 1 point per $1 (after discount)
        if (pointsEarned > 0) {
          await prisma.$transaction(async (tx) => {
            await tx.credit.create({
              data: {
                userId,
                amount: pointsEarned,
                type: "earned",
                reason: `Purchase - Order #${order.orderNumber}`,
                orderId: order.id,
              },
            });
            await tx.user.update({
              where: { id: userId },
              data: { creditBalance: { increment: pointsEarned } },
            });
          });
        }
      } catch (rewardErr) {
        // Log but don't fail the order — reward points are best-effort
        console.error("Reward points error:", rewardErr);
      }
    }

    // Fire-and-forget notification for admin
    createNotification(
      "new_order",
      "New Order",
      `Order ${order.orderNumber} placed for $${order.total}`,
      `/admin/orders/${order.id}`
    ).catch((e) => console.error("Notification error:", e));

    // Fire-and-forget order confirmation email
    resolveRecipients("order_placed", orderData.email)
      .then((recipients) =>
        Promise.all(
          recipients.map((to) =>
            sendEmail({
              type: "order_placed",
              to,
              subject: `Your ResinPlug Order #${order.orderNumber}`,
              react: createElement(OrderPlaced, {
                orderNumber: order.orderNumber,
                firstName: orderData.firstName,
                items: items.map((i) => ({
                  productName: i.productName,
                  weight: i.weight,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                })),
                subtotal,
                shippingCost,
                total,
                discountAmount: Number(order.discountAmount) || undefined,
                creditsUsed: creditsDiscount || undefined,
                street1: orderData.street1,
                street2: orderData.street2 || undefined,
                city: orderData.city,
                province: orderData.province,
                postalCode: orderData.postalCode,
                country: orderData.country,
              }),
              orderId: order.id,
              userId: userId || undefined,
            })
          )
        )
      )
      .catch((e) => console.error("Order email error:", e));

    return success(serializeDecimals(order), { status: 201 });
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return serverError();
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return success(serializeDecimals(orders));
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return serverError();
  }
}

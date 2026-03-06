import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, badRequest, unauthorized, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { createNotification } from "@/lib/notifications";
import { sendEmail, resolveRecipients, getEmailContentWithDefaults } from "@/lib/email";
import { createElement } from "react";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import OrderPlaced from "@/emails/OrderPlaced";
import AccountSetup from "@/emails/AccountSetup";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { orderLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

// Defaults — overridden by SiteSetting values at runtime
const DEFAULT_FREE_SHIPPING_THRESHOLD = 200;
const DEFAULT_SHIPPING_COST = 9.99;
const DEFAULT_POINTS_PER_DOLLAR = 100; // 100 points = $1 store credit

async function getBusinessValues() {
  // Keys must match what the admin Settings page writes (camelCase)
  const keys = ["freeShippingThreshold", "shippingCost", "pointsPerDollar"] as const;
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: [...keys] } },
  });
  const map = new Map(settings.map((s) => [s.key, s.value]));
  return {
    freeShippingThreshold: parseFloat(map.get("freeShippingThreshold") || "") || DEFAULT_FREE_SHIPPING_THRESHOLD,
    shippingCost: parseFloat(map.get("shippingCost") || "") || DEFAULT_SHIPPING_COST,
    pointsPerDollar: parseFloat(map.get("pointsPerDollar") || "") || DEFAULT_POINTS_PER_DOLLAR,
  };
}

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
  couponCode: z.string().optional(),
});

/** Generate order number with 6 cryptographically-random alphanumeric chars */
function generateOrderNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randPart = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
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
    // Rate limit order creation (10 per IP per hour)
    const { limited } = await checkRateLimit(orderLimiter, getClientIp(request));
    if (limited) {
      return badRequest("Too many orders. Please try again later.");
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { items, rewardPointsUsed, couponCode, ...orderData } = parsed.data;

    // Load business values from SiteSetting (with hardcoded fallbacks)
    const { freeShippingThreshold, shippingCost: configShippingCost, pointsPerDollar } = await getBusinessValues();

    // Calculate subtotal server-side (never trust client)
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const shippingCost =
      subtotal >= freeShippingThreshold ? 0 : configShippingCost;

    // Get authenticated user if logged in (optional for guest checkout)
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // --- Validate coupon (fast-fail before transaction) ---
    let couponDiscount = 0;
    let validatedCouponId: string | null = null;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });
      if (!coupon || !coupon.isActive) {
        return badRequest("Invalid or inactive coupon code");
      }
      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        return badRequest("Coupon has expired");
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return badRequest("Coupon usage limit reached");
      }
      if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
        return badRequest(
          `Minimum order of $${Number(coupon.minOrder).toFixed(2)} required for this coupon`
        );
      }
      // Calculate discount amount
      if (coupon.discountType === "percentage") {
        couponDiscount =
          Math.round(((subtotal * Number(coupon.discountValue)) / 100) * 100) /
          100;
      } else {
        couponDiscount = Math.round(Number(coupon.discountValue) * 100) / 100;
      }
      // Cap coupon discount at subtotal
      couponDiscount = Math.min(couponDiscount, subtotal);
      validatedCouponId = coupon.id;
    }

    // --- Pre-validate reward points ---
    let creditsDiscount = 0;
    if (rewardPointsUsed > 0) {
      if (!userId) {
        return badRequest("Must be logged in to use reward points");
      }
      creditsDiscount =
        Math.round((rewardPointsUsed / pointsPerDollar) * 100) / 100;
    }

    // Ensure credits don't exceed remaining total after coupon
    const maxCreditsDiscount = subtotal + shippingCost - couponDiscount;
    if (creditsDiscount > maxCreditsDiscount) {
      creditsDiscount = maxCreditsDiscount;
    }

    const total =
      Math.round(
        (subtotal + shippingCost - couponDiscount - creditsDiscount) * 100
      ) / 100;

    // --- Create order inside atomic transaction with retry for order number collisions ---
    const MAX_RETRIES = 3;
    let order: Awaited<ReturnType<typeof prisma.order.create>> | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const orderNumber = generateOrderNumber();

      try {
        order = await prisma.$transaction(async (tx) => {
          // 1. Lock user row and validate reward points balance atomically
          if (rewardPointsUsed > 0 && userId) {
            const rows = await tx.$queryRaw<{ creditBalance: unknown }[]>`
              SELECT "creditBalance" FROM "User" WHERE id = ${userId} FOR UPDATE
            `;
            if (
              rows.length === 0 ||
              Number(rows[0].creditBalance) < rewardPointsUsed
            ) {
              throw new Error("INSUFFICIENT_POINTS");
            }
          }

          // 2. Create the order
          const newOrder = await tx.order.create({
            data: {
              orderNumber,
              userId,
              subtotal,
              shippingCost,
              total,
              couponCode: couponCode?.toUpperCase() || null,
              discountAmount: couponDiscount > 0 ? couponDiscount : null,
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

          // 3. Deduct stock atomically (guard against going negative)
          for (const item of newOrder.items) {
            if (!item.productId) continue;

            const variant = await tx.variant.findFirst({
              where: { productId: item.productId, weight: item.weight },
            });

            let gramsToDeduct: number;
            if (variant?.gramsPerUnit) {
              gramsToDeduct = Number(variant.gramsPerUnit) * item.quantity;
            } else {
              gramsToDeduct = parseGramsFromWeight(item.weight) * item.quantity;
            }

            if (gramsToDeduct > 0) {
              // Only decrement if stock is sufficient (prevents negative stock)
              const result = await tx.$queryRaw<{ id: string }[]>`
                UPDATE "Product"
                SET "totalStockGrams" = "totalStockGrams" - ${gramsToDeduct}
                WHERE id = ${item.productId}
                  AND "totalStockGrams" IS NOT NULL
                  AND "totalStockGrams" >= ${gramsToDeduct}
                RETURNING id
              `;
              if (result.length > 0) {
                await tx.stockMovement.create({
                  data: {
                    productId: item.productId,
                    type: "order_deduction",
                    quantity: -gramsToDeduct,
                    reason: `Order #${orderNumber}`,
                    reference: newOrder.id,
                  },
                });
              }
            }
          }

          // 4. Increment coupon usage count
          if (validatedCouponId) {
            await tx.coupon.update({
              where: { id: validatedCouponId },
              data: { usedCount: { increment: 1 } },
            });
          }

          // 5. Deduct reward points
          if (rewardPointsUsed > 0 && userId) {
            await tx.credit.create({
              data: {
                userId,
                amount: rewardPointsUsed,
                type: "spent",
                reason: `Redeemed at checkout - Order #${orderNumber}`,
                orderId: newOrder.id,
              },
            });
            await tx.user.update({
              where: { id: userId },
              data: { creditBalance: { decrement: rewardPointsUsed } },
            });
          }

          // 6. Award reward points (1 point per $1 spent, logged-in users only)
          if (userId) {
            const pointsEarned = Math.round(total);
            if (pointsEarned > 0) {
              await tx.credit.create({
                data: {
                  userId,
                  amount: pointsEarned,
                  type: "earned",
                  reason: `Purchase - Order #${orderNumber}`,
                  orderId: newOrder.id,
                },
              });
              await tx.user.update({
                where: { id: userId },
                data: { creditBalance: { increment: pointsEarned } },
              });
            }
          }

          // 7. Create "created" order event
          await tx.orderEvent.create({
            data: {
              orderId: newOrder.id,
              type: "created",
              toValue: "processing",
              note: `Order ${orderNumber} created`,
            },
          });

          return newOrder;
        });

        break; // Transaction succeeded, exit retry loop
      } catch (err: unknown) {
        lastError = err;

        // Known business error: insufficient points
        if (err instanceof Error && err.message === "INSUFFICIENT_POINTS") {
          return badRequest("Insufficient reward points");
        }

        // P2002 = unique constraint violation (order number collision) — retry
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < MAX_RETRIES - 1
        ) {
          continue;
        }

        throw err; // Re-throw unexpected errors
      }
    }

    if (!order) {
      console.error("Order creation failed after retries:", lastError);
      return serverError();
    }

    // Fire-and-forget notification for admin
    createNotification(
      "new_order",
      "New Order",
      `Order ${order.orderNumber} placed for $${order.total}`,
      `/admin/orders/${order.id}`
    ).catch((e) => console.error("Notification error:", e));

    // Fire-and-forget order confirmation email
    getEmailContentWithDefaults("order_placed")
      .then((content) =>
        resolveRecipients("order_placed", orderData.email).then((recipients) =>
          Promise.all(
            recipients.map((to) =>
              sendEmail({
                type: "order_placed",
                to,
                subject: `Your ResinPlug Order #${order!.orderNumber}`,
                react: createElement(OrderPlaced, {
                  orderNumber: order!.orderNumber,
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
                  discountAmount: couponDiscount || undefined,
                  creditsUsed: creditsDiscount || undefined,
                  street1: orderData.street1,
                  street2: orderData.street2 || undefined,
                  city: orderData.city,
                  province: orderData.province,
                  postalCode: orderData.postalCode,
                  country: orderData.country,
                  customHeading: content.heading,
                  customBody: content.body,
                  customButtonText: content.buttonText,
                }),
                orderId: order!.id,
                userId: userId || undefined,
              })
            )
          )
        )
      )
      .catch((e) => console.error("Order email error:", e));

    // --- Soft account creation for guest orders (fire-and-forget) ---
    if (!userId && order) {
      (async () => {
        try {
          const guestEmail = orderData.email.toLowerCase();
          const existingUser = await prisma.user.findUnique({
            where: { email: guestEmail },
            select: { id: true, needsPasswordSetup: true },
          });

          let softUserId: string;
          let isNewAccount = false;

          if (existingUser) {
            // User already exists (real account or returning guest) — just link order
            softUserId = existingUser.id;
          } else {
            // Create soft account with random impossible password
            const randomPassword = crypto.randomBytes(32).toString("hex");
            const hashedPassword = await bcrypt.hash(randomPassword, 12);
            const newUser = await prisma.user.create({
              data: {
                name: `${orderData.firstName} ${orderData.lastName}`,
                email: guestEmail,
                hashedPassword,
                phone: orderData.phone || undefined,
                needsPasswordSetup: true,
              },
            });
            softUserId = newUser.id;
            isNewAccount = true;
          }

          // Link order to user
          await prisma.order.update({
            where: { id: order!.id },
            data: { userId: softUserId },
          });

          // Award reward points (same logic as authenticated checkout)
          const pointsEarned = Math.round(Number(order!.total));
          if (pointsEarned > 0) {
            await prisma.credit.create({
              data: {
                userId: softUserId,
                amount: pointsEarned,
                type: "earned",
                reason: `Purchase - Order #${order!.orderNumber}`,
                orderId: order!.id,
              },
            });
            await prisma.user.update({
              where: { id: softUserId },
              data: { creditBalance: { increment: pointsEarned } },
            });
          }

          // Send "set your password" email (only for newly created accounts)
          if (isNewAccount) {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            const setupUrl = `${frontendUrl}/set-password?email=${encodeURIComponent(guestEmail)}`;

            getEmailContentWithDefaults("account_setup")
              .then((content) =>
                sendEmail({
                  type: "account_setup",
                  to: guestEmail,
                  subject: `Your ResinPlug Account — Order #${order!.orderNumber}`,
                  react: createElement(AccountSetup, {
                    firstName: orderData.firstName,
                    orderNumber: order!.orderNumber,
                    pointsEarned,
                    setupUrl,
                    customHeading: content.heading,
                    customBody: content.body,
                    customButtonText: content.buttonText,
                  }),
                  orderId: order!.id,
                  userId: softUserId,
                })
              )
              .catch((e) => console.error("Account setup email error:", e));

            // Admin notification for new customer
            createNotification(
              "new_customer",
              "New Customer (Guest)",
              `${orderData.firstName} ${orderData.lastName} (${guestEmail}) — auto-created from guest checkout`,
              `/admin/customers`
            ).catch((e) => console.error("Notification error:", e));
          }
        } catch (e) {
          // Non-fatal — the order was already created successfully
          console.error("Soft account creation error:", e);
        }
      })();
    }

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

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, badRequest, unauthorized, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const FREE_SHIPPING_THRESHOLD = 200;
const SHIPPING_COST = 9.99;

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

    const { items, ...orderData } = parsed.data;

    // Calculate totals server-side (never trust client)
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const shippingCost =
      subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shippingCost;

    // Get authenticated user if logged in (optional for guest checkout)
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        subtotal,
        shippingCost,
        total,
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

    // Fire-and-forget notification for admin
    createNotification(
      "new_order",
      "New Order",
      `Order ${order.orderNumber} placed for $${order.total}`,
      `/admin/orders/${order.id}`
    ).catch((e) => console.error("Notification error:", e));

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

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError, badRequest } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logActivity } from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status");
    const email = searchParams.get("email");

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      // Validate against the OrderStatus enum values
      const validStatuses = ["processing", "shipped", "in_transit", "delivered", "cancelled"];
      if (validStatuses.includes(status)) {
        where.status = status as Prisma.EnumOrderStatusFilter["equals"];
      }
    }

    if (email) {
      where.email = { contains: email, mode: "insensitive" };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return success(serializeDecimals(orders), {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin orders list error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();

    const schema = z.object({
      customerEmail: z.string().email(),
      customerName: z.string().min(1),
      items: z.array(z.object({
        productId: z.string().optional(),
        productName: z.string(),
        weight: z.string(),
        unitPrice: z.number().positive(),
        quantity: z.number().int().positive(),
        image: z.string().optional(),
      })).min(1, "At least one item required"),
      shippingAddress: z.object({
        firstName: z.string(),
        lastName: z.string(),
        address: z.string(),
        city: z.string(),
        province: z.string(),
        postalCode: z.string(),
        country: z.string().default("Canada"),
        phone: z.string().optional(),
      }).optional(),
      notes: z.string().optional(),
      applyShipping: z.boolean().default(true),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const { customerEmail, customerName, items, shippingAddress, notes, applyShipping } = parsed.data;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const shipping = applyShipping ? 9.99 : 0;
    const total = subtotal + shipping;

    // Generate order number
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const orderNumber = "RP-" + dateStr + "-" + rand;

    // Find or reference user
    const user = await prisma.user.findUnique({ where: { email: customerEmail } });

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user?.id || null,
        email: customerEmail,
        firstName: shippingAddress?.firstName || customerName.split(" ")[0],
        lastName: shippingAddress?.lastName || customerName.split(" ").slice(1).join(" ") || "",
        street1: shippingAddress?.address || "",
        city: shippingAddress?.city || "",
        province: shippingAddress?.province || "",
        postalCode: shippingAddress?.postalCode || "",
        country: shippingAddress?.country || "Canada",
        phone: shippingAddress?.phone || "",
        subtotal,
        shippingCost: shipping,
        total,
        status: "processing",
        paymentMethod: "manual",
        notes: notes || "Manual order created by admin",
        items: {
          create: items.map(item => ({
            productId: item.productId || null,
            productName: item.productName,
            productImage: item.image || "",
            weight: item.weight,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Create order event
    try {
      const adminId = (session!.user as any).id;
      const adminName = (session!.user as any).name || (session!.user as any).email;
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: "created",
          note: "Manual order created by admin",
          adminId,
          adminName,
        },
      });
      await logActivity(adminId, "order.create", "order", order.id, "Manual order " + orderNumber).catch(() => {});
    } catch {}

    return success(serializeDecimals(order));
  } catch (err) {
    console.error("Create order error:", err);
    return serverError("Failed to create order");
  }
}

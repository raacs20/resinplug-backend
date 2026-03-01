import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

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

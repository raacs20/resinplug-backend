import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sort = searchParams.get("sort") || "recent"; // recent | orders | spent

    // Get total count for pagination
    const total = await prisma.user.count();

    // Get users with order aggregates
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          select: { total: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy:
        sort === "orders"
          ? { orders: { _count: "desc" } }
          : sort === "spent"
            ? // For spent, we sort in JS below since Prisma can't aggregate-sort
              { createdAt: "desc" }
            : { createdAt: "desc" },
    });

    // Map to include computed fields
    let customers = users.map((user) => {
      const totalSpent = user.orders.reduce(
        (sum, order) => sum + Number(order.total),
        0
      );
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        orderCount: user._count.orders,
        totalSpent: Math.round(totalSpent * 100) / 100,
      };
    });

    // Sort by totalSpent in JS if requested (Prisma doesn't support aggregate ordering)
    if (sort === "spent") {
      customers = customers.sort((a, b) => b.totalSpent - a.totalSpent);
    }

    return success(serializeDecimals(customers), {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin customers list error:", err);
    return serverError();
  }
}

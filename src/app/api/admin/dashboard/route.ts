import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(_request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // Calculate the start of today (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Run all aggregations in parallel
    const [
      totalOrders,
      totalRevenueResult,
      totalCustomers,
      ordersToday,
      revenueTodayResult,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.user.count(),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { items: true, user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const stats = {
      totalOrders,
      totalRevenue: totalRevenueResult._sum.total?.toNumber() ?? 0,
      totalCustomers,
      ordersToday,
      revenueToday: revenueTodayResult._sum.total?.toNumber() ?? 0,
    };

    return success({
      stats,
      recentOrders: serializeDecimals(recentOrders),
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    return serverError();
  }
}

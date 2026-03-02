import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

type RangeKey = "today" | "7d" | "30d" | "90d" | "365d";

function parseRange(rangeParam: string | null): {
  days: number;
  label: string;
  comparisonLabel: string;
} {
  const key = (rangeParam || "30d") as RangeKey;
  switch (key) {
    case "today":
      return { days: 1, label: "Today", comparisonLabel: "vs yesterday" };
    case "7d":
      return { days: 7, label: "7 Days", comparisonLabel: "vs previous 7 days" };
    case "90d":
      return { days: 90, label: "90 Days", comparisonLabel: "vs previous 90 days" };
    case "365d":
      return { days: 365, label: "Year", comparisonLabel: "vs previous year" };
    case "30d":
    default:
      return { days: 30, label: "30 Days", comparisonLabel: "vs previous 30 days" };
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const url = new URL(request.url);
    const rangeParam = url.searchParams.get("range");
    const { days, label: rangeLabel, comparisonLabel } = parseRange(rangeParam);

    // Date boundaries
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    // Current period start
    const periodStart = new Date(now);
    periodStart.setUTCDate(periodStart.getUTCDate() - days);
    periodStart.setUTCHours(0, 0, 0, 0);

    // Previous period (same length, immediately before current period)
    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setUTCDate(prevPeriodStart.getUTCDate() - days);
    prevPeriodStart.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    // Run all aggregations in parallel
    const [
      totalOrders,
      totalRevenueResult,
      totalCustomers,
      ordersToday,
      revenueTodayResult,
      recentOrders,
      prevPeriodRevenueResult,
      newCustomersThisWeek,
      ordersByStatusRaw,
      lowStockProducts,
      recentActivity,
      ordersInPeriod,
      topProductItems,
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
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),

      // Previous period revenue for comparison
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: prevPeriodStart, lt: periodStart },
        },
      }),

      // New customers this week
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),

      // Orders grouped by status (within selected period)
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { createdAt: { gte: periodStart } },
      }),

      // Low stock products
      prisma.product.findMany({
        where: {
          totalStockGrams: { not: null, lt: 100 },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          totalStockGrams: true,
          stockUnit: true,
        },
        orderBy: { totalStockGrams: "asc" },
        take: 20,
      }),

      // Recent activity log
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),

      // Orders in the selected period for chart data
      prisma.order.findMany({
        where: { createdAt: { gte: periodStart } },
        select: {
          createdAt: true,
          total: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // Top products by units sold (within selected period)
      prisma.orderItem.groupBy({
        by: ["productName"],
        _sum: { quantity: true },
        where: {
          order: { createdAt: { gte: periodStart } },
        },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    // --- Compute derived data ---

    const totalRevenue = totalRevenueResult._sum.total?.toNumber() ?? 0;
    const prevPeriodRevenue =
      prevPeriodRevenueResult._sum.total?.toNumber() ?? 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue percentage change (current period vs previous period)
    let revenueChange: number | null = null;
    const currentPeriodRevenue = ordersInPeriod.reduce(
      (sum, o) => sum + (o.total as unknown as { toNumber: () => number }).toNumber(),
      0
    );
    if (prevPeriodRevenue > 0) {
      revenueChange = ((currentPeriodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100;
    }

    // Build revenue chart and orders chart (one entry per day for the selected period)
    const revenueByDay = new Map<string, number>();
    const ordersByDay = new Map<string, number>();

    // Pre-fill all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      revenueByDay.set(key, 0);
      ordersByDay.set(key, 0);
    }

    // Aggregate orders into day buckets
    for (const order of ordersInPeriod) {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      const amount = (order.total as unknown as { toNumber: () => number }).toNumber();
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + amount);
      ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
    }

    const revenueChart = Array.from(revenueByDay.entries()).map(
      ([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
      })
    );

    const ordersChart = Array.from(ordersByDay.entries()).map(
      ([date, orders]) => ({
        date,
        orders,
      })
    );

    // Orders by status object
    const ordersByStatus: Record<string, number> = {
      processing: 0,
      shipped: 0,
      in_transit: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const row of ordersByStatusRaw) {
      ordersByStatus[row.status] = row._count._all;
    }

    // Top products with revenue
    const topProductNames = topProductItems.map((p) => p.productName);
    const topProductItemsDetailed = topProductNames.length > 0
      ? await prisma.orderItem.findMany({
          where: {
            productName: { in: topProductNames },
            order: { createdAt: { gte: periodStart } },
          },
          select: { productName: true, quantity: true, unitPrice: true },
        })
      : [];

    const productRevenueMap = new Map<
      string,
      { unitsSold: number; revenue: number }
    >();
    for (const item of topProductItemsDetailed) {
      const existing = productRevenueMap.get(item.productName) ?? {
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue +=
        item.quantity *
        (item.unitPrice as unknown as { toNumber: () => number }).toNumber();
      productRevenueMap.set(item.productName, existing);
    }

    const topProducts = topProductNames.map((name) => {
      const data = productRevenueMap.get(name) ?? {
        unitsSold: 0,
        revenue: 0,
      };
      return {
        name,
        unitsSold: data.unitsSold,
        revenue: Math.round(data.revenue * 100) / 100,
      };
    });

    // Low stock formatting
    const formattedLowStock = lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      stock: p.totalStockGrams
        ? (p.totalStockGrams as unknown as { toNumber: () => number }).toNumber()
        : 0,
      unit: p.stockUnit,
    }));

    const ordersInPeriodCount = ordersInPeriod.length;

    const stats = {
      totalOrders,
      totalRevenue,
      totalCustomers,
      ordersToday,
      revenueToday: revenueTodayResult._sum.total?.toNumber() ?? 0,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      revenueChange: revenueChange !== null ? Math.round(revenueChange * 10) / 10 : null,
      newCustomersThisWeek,
      periodRevenue: Math.round(currentPeriodRevenue * 100) / 100,
      ordersInPeriod: ordersInPeriodCount,
    };

    return success({
      stats,
      recentOrders: serializeDecimals(recentOrders),
      revenueChart,
      ordersChart,
      topProducts,
      ordersByStatus,
      lowStockProducts: formattedLowStock,
      recentActivity: serializeDecimals(recentActivity),
      range: rangeParam || "30d",
      rangeLabel,
      comparisonLabel,
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    return serverError();
  }
}

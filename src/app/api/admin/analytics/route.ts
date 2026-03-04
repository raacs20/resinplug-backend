import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";

// Safely extract Decimal value as number
function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("range") || "30");
  const type = url.searchParams.get("type") || "traffic";
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setUTCHours(0, 0, 0, 0);

  try {
    if (type === "traffic") return await handleTraffic(days, startDate);
    if (type === "funnel") return await handleFunnel(days, startDate);
    if (type === "geo") return await handleGeo(startDate);
    if (type === "customers") return await handleCustomers(startDate);
    return badRequest("Invalid type. Use: traffic, funnel, geo, customers");
  } catch (err) {
    console.error("Analytics error:", err);
    return serverError("Failed to generate analytics");
  }
}

/* ── Traffic ── */
async function handleTraffic(days: number, startDate: Date) {
  const [totalPageViews, uniqueVisitors, pageViews, topPagesRaw] =
    await Promise.all([
      prisma.analyticsEvent.count({
        where: { event: "page_view", createdAt: { gte: startDate } },
      }),
      prisma.analyticsEvent
        .findMany({
          where: { event: "page_view", createdAt: { gte: startDate } },
          distinct: ["sessionId"],
          select: { sessionId: true },
        })
        .then((r) => r.length),
      prisma.analyticsEvent.findMany({
        where: { event: "page_view", createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["url"],
        where: { event: "page_view", createdAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { url: "desc" } },
        take: 20,
      }),
    ]);

  // Build page views by day
  const now = new Date();
  const viewsByDayMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    viewsByDayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const pv of pageViews) {
    const key = new Date(pv.createdAt).toISOString().slice(0, 10);
    viewsByDayMap.set(key, (viewsByDayMap.get(key) ?? 0) + 1);
  }
  const pageViewsByDay = Array.from(viewsByDayMap.entries()).map(
    ([date, views]) => ({ date, views })
  );

  const topPages = topPagesRaw.map((p) => ({
    url: p.url || "(unknown)",
    views: p._count,
  }));

  return success({
    totalPageViews,
    uniqueVisitors,
    avgViewsPerVisitor:
      uniqueVisitors > 0
        ? Math.round((totalPageViews / uniqueVisitors) * 10) / 10
        : 0,
    pageViewsByDay,
    topPages,
  });
}

/* ── Funnel ── */
async function handleFunnel(days: number, startDate: Date) {
  const stages = [
    "page_view",
    "view_item",
    "add_to_cart",
    "begin_checkout",
    "purchase",
  ];

  // Count distinct sessions per stage
  const stageCounts = await Promise.all(
    stages.map(async (event) => {
      const sessions = await prisma.analyticsEvent.findMany({
        where: { event, createdAt: { gte: startDate } },
        distinct: ["sessionId"],
        select: { sessionId: true },
      });
      return { event, sessions: sessions.length };
    })
  );

  // Calculate drop-off rates
  const funnel = stageCounts.map((stage, i) => {
    const prevSessions = i > 0 ? stageCounts[i - 1].sessions : stage.sessions;
    const rate =
      prevSessions > 0
        ? Math.round((stage.sessions / prevSessions) * 1000) / 10
        : 0;
    const overallRate =
      stageCounts[0].sessions > 0
        ? Math.round((stage.sessions / stageCounts[0].sessions) * 1000) / 10
        : 0;
    return {
      stage: stage.event,
      label: formatStageName(stage.event),
      sessions: stage.sessions,
      rate,
      overallRate,
    };
  });

  // Daily funnel data for trend chart
  const now = new Date();
  const funnelByDay: Array<Record<string, unknown>> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const dayStart = new Date(dayStr + "T00:00:00Z");
    const dayEnd = new Date(dayStr + "T23:59:59.999Z");

    const row: Record<string, unknown> = { date: dayStr };
    for (const stage of ["page_view", "add_to_cart", "purchase"]) {
      const count = await prisma.analyticsEvent.count({
        where: {
          event: stage,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });
      row[stage] = count;
    }
    funnelByDay.push(row);
  }

  return success({
    funnel,
    funnelByDay,
    cartRate:
      stageCounts[0].sessions > 0
        ? Math.round(
            ((stageCounts.find((s) => s.event === "add_to_cart")?.sessions ||
              0) /
              stageCounts[0].sessions) *
              1000
          ) / 10
        : 0,
    checkoutRate:
      stageCounts[0].sessions > 0
        ? Math.round(
            ((stageCounts.find((s) => s.event === "begin_checkout")?.sessions ||
              0) /
              stageCounts[0].sessions) *
              1000
          ) / 10
        : 0,
    purchaseRate:
      stageCounts[0].sessions > 0
        ? Math.round(
            ((stageCounts.find((s) => s.event === "purchase")?.sessions || 0) /
              stageCounts[0].sessions) *
              1000
          ) / 10
        : 0,
  });
}

function formatStageName(event: string): string {
  const names: Record<string, string> = {
    page_view: "Page View",
    view_item: "View Product",
    add_to_cart: "Add to Cart",
    begin_checkout: "Begin Checkout",
    purchase: "Purchase",
  };
  return names[event] || event;
}

/* ── Geographic & Payment ── */
async function handleGeo(startDate: Date) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: startDate } },
    select: {
      country: true,
      province: true,
      paymentMethod: true,
      total: true,
    },
  });

  // By country
  const countryMap = new Map<
    string,
    { orders: number; revenue: number }
  >();
  for (const o of orders) {
    const country = o.country || "Unknown";
    const total = toNum(o.total);
    const existing = countryMap.get(country);
    if (existing) {
      existing.orders++;
      existing.revenue += total;
    } else {
      countryMap.set(country, { orders: 1, revenue: total });
    }
  }
  const byCountry = Array.from(countryMap.entries())
    .map(([country, stats]) => ({
      country,
      orders: stats.orders,
      revenue: Math.round(stats.revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // By province
  const provinceMap = new Map<
    string,
    { orders: number; revenue: number }
  >();
  for (const o of orders) {
    const province = o.province || "Unknown";
    const total = toNum(o.total);
    const existing = provinceMap.get(province);
    if (existing) {
      existing.orders++;
      existing.revenue += total;
    } else {
      provinceMap.set(province, { orders: 1, revenue: total });
    }
  }
  const byProvince = Array.from(provinceMap.entries())
    .map(([province, stats]) => ({
      province,
      orders: stats.orders,
      revenue: Math.round(stats.revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  // By payment method
  const paymentMap = new Map<
    string,
    { orders: number; revenue: number }
  >();
  for (const o of orders) {
    const method = o.paymentMethod || "Unknown";
    const total = toNum(o.total);
    const existing = paymentMap.get(method);
    if (existing) {
      existing.orders++;
      existing.revenue += total;
    } else {
      paymentMap.set(method, { orders: 1, revenue: total });
    }
  }
  const byPaymentMethod = Array.from(paymentMap.entries())
    .map(([method, stats]) => ({
      method,
      orders: stats.orders,
      revenue: Math.round(stats.revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return success({
    byCountry,
    byProvince,
    byPaymentMethod,
    totalCountries: byCountry.length,
    topCountry: byCountry[0]?.country || "N/A",
    topPaymentMethod: byPaymentMethod[0]?.method || "N/A",
  });
}

/* ── Customer Insights ── */
async function handleCustomers(startDate: Date) {
  // LTV distribution
  const allUsersWithOrders = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { not: null } },
    _sum: { total: true },
    _count: true,
  });

  const tiers = [
    { label: "$0 - $50", min: 0, max: 50, count: 0 },
    { label: "$50 - $100", min: 50, max: 100, count: 0 },
    { label: "$100 - $250", min: 100, max: 250, count: 0 },
    { label: "$250 - $500", min: 250, max: 500, count: 0 },
    { label: "$500+", min: 500, max: Infinity, count: 0 },
  ];

  let totalLtv = 0;
  let repeatCustomers = 0;

  for (const user of allUsersWithOrders) {
    const ltv = toNum(user._sum.total);
    totalLtv += ltv;
    if (user._count > 1) repeatCustomers++;

    for (const tier of tiers) {
      if (ltv >= tier.min && ltv < tier.max) {
        tier.count++;
        break;
      }
    }
  }

  const avgLtv =
    allUsersWithOrders.length > 0
      ? Math.round((totalLtv / allUsersWithOrders.length) * 100) / 100
      : 0;

  const repeatRate =
    allUsersWithOrders.length > 0
      ? Math.round((repeatCustomers / allUsersWithOrders.length) * 1000) / 10
      : 0;

  const ltvDistribution = tiers.map((t) => ({
    tier: t.label,
    customers: t.count,
  }));

  // Cohort data — users grouped by signup month
  const users = await prisma.user.findMany({
    where: { role: "user" },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group users by signup month
  const cohortMap = new Map<
    string,
    { userIds: string[]; signupCount: number }
  >();
  for (const u of users) {
    const month = u.createdAt.toISOString().slice(0, 7); // "2025-01"
    const existing = cohortMap.get(month);
    if (existing) {
      existing.userIds.push(u.id);
      existing.signupCount++;
    } else {
      cohortMap.set(month, { userIds: [u.id], signupCount: 1 });
    }
  }

  // Get order dates for these users
  const allOrders = await prisma.order.findMany({
    where: { userId: { not: null } },
    select: { userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Build cohort retention table (last 6 months)
  const now = new Date();
  const recentMonths: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    recentMonths.push(d.toISOString().slice(0, 7));
  }

  const cohorts = recentMonths
    .filter((month) => cohortMap.has(month))
    .map((month) => {
      const cohort = cohortMap.get(month)!;
      const userSet = new Set(cohort.userIds);

      // For each subsequent month, count how many users from this cohort purchased
      const retention: Record<string, number> = {};
      for (let offset = 0; offset <= 5; offset++) {
        const d = new Date(month + "-01T00:00:00Z");
        d.setMonth(d.getMonth() + offset);
        const targetMonth = d.toISOString().slice(0, 7);

        const purchasingUsers = new Set<string>();
        for (const order of allOrders) {
          if (!order.userId) continue;
          const orderMonth = order.createdAt.toISOString().slice(0, 7);
          if (orderMonth === targetMonth && userSet.has(order.userId)) {
            purchasingUsers.add(order.userId);
          }
        }
        retention["month_" + offset] =
          cohort.signupCount > 0
            ? Math.round(
                (purchasingUsers.size / cohort.signupCount) * 1000
              ) / 10
            : 0;
      }

      return {
        cohort: month,
        signups: cohort.signupCount,
        ...retention,
      };
    });

  // Repeat rate by month trend
  const repeatRateByMonth: Array<{ month: string; rate: number }> = [];
  for (const month of recentMonths) {
    const monthStart = new Date(month + "-01T00:00:00Z");
    const monthEnd = new Date(month + "-01T00:00:00Z");
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const monthOrders = allOrders.filter(
      (o) => o.createdAt >= monthStart && o.createdAt < monthEnd && o.userId
    );

    const userOrders = new Map<string, number>();
    for (const o of monthOrders) {
      if (o.userId) {
        userOrders.set(o.userId, (userOrders.get(o.userId) || 0) + 1);
      }
    }

    let repeats = 0;
    for (const count of userOrders.values()) {
      if (count > 1) repeats++;
    }

    repeatRateByMonth.push({
      month,
      rate:
        userOrders.size > 0
          ? Math.round((repeats / userOrders.size) * 1000) / 10
          : 0,
    });
  }

  return success({
    avgLtv,
    repeatRate,
    totalCustomers: allUsersWithOrders.length,
    ltvDistribution,
    cohorts,
    repeatRateByMonth,
  });
}

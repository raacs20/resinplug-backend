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

/* ══════════════════════════════════════════════════════════════════════
   In-memory cache — avoids re-querying millions of rows on every
   admin page load. 5-minute TTL per (type+range) combo.
   ══════════════════════════════════════════════════════════════════════ */
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
  // Evict old entries if cache grows too large (unlikely but safe)
  if (cache.size > 50) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now >= v.expires) cache.delete(k);
    }
  }
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

  const cacheKey = `${type}_${days}`;
  const cached = getCached(cacheKey);
  if (cached) return success(cached);

  try {
    let result: unknown;
    if (type === "traffic") result = await handleTraffic(days, startDate);
    else if (type === "funnel") result = await handleFunnel(days, startDate);
    else if (type === "geo") result = await handleGeo(startDate);
    else if (type === "customers") result = await handleCustomers(startDate);
    else return badRequest("Invalid type. Use: traffic, funnel, geo, customers");

    setCache(cacheKey, result);
    return success(result);
  } catch (err) {
    console.error("Analytics error:", err);
    return serverError("Failed to generate analytics");
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Traffic — uses GROUP BY instead of loading every row into memory
   ══════════════════════════════════════════════════════════════════════ */
async function handleTraffic(days: number, startDate: Date) {
  // 3 efficient queries instead of loading all rows
  const [totalPageViews, uniqueVisitorRows, viewsByDayRaw, topPagesRaw] =
    await Promise.all([
      // Simple count
      prisma.analyticsEvent.count({
        where: { event: "page_view", createdAt: { gte: startDate } },
      }),
      // COUNT DISTINCT via raw SQL — avoids loading millions of sessionIds
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "sessionId") as count
        FROM "AnalyticsEvent"
        WHERE event = 'page_view' AND "createdAt" >= ${startDate}
      `,
      // GROUP BY date — returns ~30 rows instead of ~150K rows
      prisma.$queryRaw<Array<{ day: string; views: bigint }>>`
        SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as day,
               COUNT(*) as views
        FROM "AnalyticsEvent"
        WHERE event = 'page_view' AND "createdAt" >= ${startDate}
        GROUP BY day
        ORDER BY day
      `,
      // Top pages — already efficient with groupBy
      prisma.analyticsEvent.groupBy({
        by: ["url"],
        where: { event: "page_view", createdAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { url: "desc" } },
        take: 20,
      }),
    ]);

  const uniqueVisitors = Number(uniqueVisitorRows[0]?.count ?? 0);

  // Fill in zero-days for the chart
  const viewsByDayMap = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    viewsByDayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of viewsByDayRaw) {
    viewsByDayMap.set(row.day, Number(row.views));
  }
  const pageViewsByDay = Array.from(viewsByDayMap.entries()).map(
    ([date, views]) => ({ date, views })
  );

  const topPages = topPagesRaw.map((p) => ({
    url: p.url || "(unknown)",
    views: p._count,
  }));

  return {
    totalPageViews,
    uniqueVisitors,
    avgViewsPerVisitor:
      uniqueVisitors > 0
        ? Math.round((totalPageViews / uniqueVisitors) * 10) / 10
        : 0,
    pageViewsByDay,
    topPages,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Funnel — replaces 270 individual queries with 2 batch queries
   ══════════════════════════════════════════════════════════════════════ */
async function handleFunnel(days: number, startDate: Date) {
  const stages = [
    "page_view",
    "view_item",
    "add_to_cart",
    "begin_checkout",
    "purchase",
  ];

  // 1 query: distinct sessions per event type (instead of 5 separate findMany)
  const stageRows = await prisma.$queryRaw<
    Array<{ event: string; sessions: bigint }>
  >`
    SELECT event, COUNT(DISTINCT "sessionId") as sessions
    FROM "AnalyticsEvent"
    WHERE event IN ('page_view','view_item','add_to_cart','begin_checkout','purchase')
      AND "createdAt" >= ${startDate}
    GROUP BY event
  `;

  const stageMap = new Map(
    stageRows.map((r) => [r.event, Number(r.sessions)])
  );
  const stageCounts = stages.map((event) => ({
    event,
    sessions: stageMap.get(event) || 0,
  }));

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

  // 1 query: daily counts for 3 key stages (instead of days×3 queries)
  const dailyRows = await prisma.$queryRaw<
    Array<{ day: string; event: string; cnt: bigint }>
  >`
    SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as day,
           event,
           COUNT(*) as cnt
    FROM "AnalyticsEvent"
    WHERE event IN ('page_view','add_to_cart','purchase')
      AND "createdAt" >= ${startDate}
    GROUP BY day, event
    ORDER BY day
  `;

  // Build daily map
  const dailyMap = new Map<string, Record<string, number>>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { page_view: 0, add_to_cart: 0, purchase: 0 });
  }
  for (const row of dailyRows) {
    const dayData = dailyMap.get(row.day);
    if (dayData) dayData[row.event] = Number(row.cnt);
  }
  const funnelByDay = Array.from(dailyMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  return {
    funnel,
    funnelByDay,
    cartRate:
      stageCounts[0].sessions > 0
        ? Math.round(
            ((stageMap.get("add_to_cart") || 0) / stageCounts[0].sessions) *
              1000
          ) / 10
        : 0,
    checkoutRate:
      stageCounts[0].sessions > 0
        ? Math.round(
            ((stageMap.get("begin_checkout") || 0) /
              stageCounts[0].sessions) *
              1000
          ) / 10
        : 0,
    purchaseRate:
      stageCounts[0].sessions > 0
        ? Math.round(
            ((stageMap.get("purchase") || 0) / stageCounts[0].sessions) * 1000
          ) / 10
        : 0,
  };
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

/* ══════════════════════════════════════════════════════════════════════
   Geographic & Payment — queries Order table (small), already efficient
   ══════════════════════════════════════════════════════════════════════ */
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
  const countryMap = new Map<string, { orders: number; revenue: number }>();
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
  const provinceMap = new Map<string, { orders: number; revenue: number }>();
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
  const paymentMap = new Map<string, { orders: number; revenue: number }>();
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

  return {
    byCountry,
    byProvince,
    byPaymentMethod,
    totalCountries: byCountry.length,
    topCountry: byCountry[0]?.country || "N/A",
    topPaymentMethod: byPaymentMethod[0]?.method || "N/A",
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Customer Insights — queries Order + User tables (small), already efficient
   ══════════════════════════════════════════════════════════════════════ */
async function handleCustomers(startDate: Date) {
  // LTV distribution — groupBy is efficient
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
    const month = u.createdAt.toISOString().slice(0, 7);
    const existing = cohortMap.get(month);
    if (existing) {
      existing.userIds.push(u.id);
      existing.signupCount++;
    } else {
      cohortMap.set(month, { userIds: [u.id], signupCount: 1 });
    }
  }

  // Get order dates — only userId + month needed
  const allOrders = await prisma.order.findMany({
    where: { userId: { not: null } },
    select: { userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Pre-index orders by month for O(1) lookup instead of O(n) scan
  const ordersByMonth = new Map<string, Map<string, boolean>>();
  for (const order of allOrders) {
    if (!order.userId) continue;
    const month = order.createdAt.toISOString().slice(0, 7);
    let monthMap = ordersByMonth.get(month);
    if (!monthMap) {
      monthMap = new Map();
      ordersByMonth.set(month, monthMap);
    }
    monthMap.set(order.userId, true);
  }

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

      const retention: Record<string, number> = {};
      for (let offset = 0; offset <= 5; offset++) {
        const d = new Date(month + "-01T00:00:00Z");
        d.setMonth(d.getMonth() + offset);
        const targetMonth = d.toISOString().slice(0, 7);

        // O(cohort_size) lookup instead of O(all_orders)
        const monthOrders = ordersByMonth.get(targetMonth);
        let purchasingCount = 0;
        if (monthOrders) {
          for (const uid of userSet) {
            if (monthOrders.has(uid)) purchasingCount++;
          }
        }

        retention["month_" + offset] =
          cohort.signupCount > 0
            ? Math.round((purchasingCount / cohort.signupCount) * 1000) / 10
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
    const monthOrders = ordersByMonth.get(month);
    if (!monthOrders) {
      repeatRateByMonth.push({ month, rate: 0 });
      continue;
    }

    // Count orders per user this month
    const userOrderCounts = new Map<string, number>();
    for (const order of allOrders) {
      if (!order.userId) continue;
      const orderMonth = order.createdAt.toISOString().slice(0, 7);
      if (orderMonth === month) {
        userOrderCounts.set(
          order.userId,
          (userOrderCounts.get(order.userId) || 0) + 1
        );
      }
    }

    let repeats = 0;
    for (const count of userOrderCounts.values()) {
      if (count > 1) repeats++;
    }

    repeatRateByMonth.push({
      month,
      rate:
        userOrderCounts.size > 0
          ? Math.round((repeats / userOrderCounts.size) * 1000) / 10
          : 0,
    });
  }

  return {
    avgLtv,
    repeatRate,
    totalCustomers: allUsersWithOrders.length,
    ltvDistribution,
    cohorts,
    repeatRateByMonth,
  };
}

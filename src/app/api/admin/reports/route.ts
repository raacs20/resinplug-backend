import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";

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
  const type = url.searchParams.get("type") || "overview";
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setUTCHours(0, 0, 0, 0);

  try {
    if (type === "overview") {
      return await handleOverview(days, startDate);
    }
    if (type === "products") {
      return await handleProducts(startDate);
    }
    if (type === "categories") {
      return await handleCategories(startDate);
    }
    if (type === "customers") {
      return await handleCustomers(startDate);
    }
    return success({});
  } catch (err) {
    console.error("Reports error:", err);
    return serverError("Failed to generate report");
  }
}
async function handleOverview(days: number, startDate: Date) {
  const [
    totalRevenueResult,
    totalOrders,
    totalCustomers,
    avgOrderValueResult,
    ordersInPeriod,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { createdAt: { gte: startDate } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: startDate }, role: "user" },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startDate } },
      _avg: { total: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, total: true, userId: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalRevenue = toNum(totalRevenueResult._sum.total);
  const avgOrderValue = toNum(avgOrderValueResult._avg.total);

  const now = new Date();
  const revenueByDayMap = new Map<string, number>();
  const ordersByDayMap = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    revenueByDayMap.set(key, 0);
    ordersByDayMap.set(key, 0);
  }

  const userOrderCounts = new Map<string, number>();
  for (const order of ordersInPeriod) {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const amount = toNum(order.total);
    revenueByDayMap.set(key, (revenueByDayMap.get(key) ?? 0) + amount);
    ordersByDayMap.set(key, (ordersByDayMap.get(key) ?? 0) + 1);
    if (order.userId) {
      userOrderCounts.set(order.userId, (userOrderCounts.get(order.userId) ?? 0) + 1);
    }
  }

  const revenueByDay = Array.from(revenueByDayMap.entries()).map(([date, revenue]) => ({
    date,
    revenue: Math.round(revenue * 100) / 100,
  }));

  const ordersByDay = Array.from(ordersByDayMap.entries()).map(([date, count]) => ({
    date,
    orders: count,
  }));

  const totalUsersWithOrders = userOrderCounts.size;
  let repeatCustomers = 0;
  for (const count of userOrderCounts.values()) {
    if (count > 1) repeatCustomers++;
  }
  const repeatCustomerRate = totalUsersWithOrders > 0
    ? Math.round((repeatCustomers / totalUsersWithOrders) * 1000) / 10
    : 0;

  return success({
    totalRevenue,
    totalOrders,
    totalCustomers,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    repeatCustomerRate,
    repeatCustomers,
    totalUsersWithOrders,
    revenueByDay,
    ordersByDay,
  });
}
async function handleProducts(startDate: Date) {
  const orderItems = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: startDate } } },
    select: {
      productId: true,
      productName: true,
      productImage: true,
      unitPrice: true,
      quantity: true,
    },
  });

  const productMap = new Map<string, {
    productId: string | null;
    name: string;
    image: string;
    revenue: number;
    unitsSold: number;
    orders: number;
  }>();

  for (const item of orderItems) {
    const key = item.productId || item.productName;
    const unitPrice = toNum(item.unitPrice);
    const itemRevenue = unitPrice * item.quantity;
    const existing = productMap.get(key);

    if (existing) {
      existing.revenue += itemRevenue;
      existing.unitsSold += item.quantity;
      existing.orders += 1;
    } else {
      productMap.set(key, {
        productId: item.productId,
        name: item.productName,
        image: item.productImage,
        revenue: itemRevenue,
        unitsSold: item.quantity,
        orders: 1,
      });
    }
  }

  const productIds = Array.from(productMap.values())
    .map(p => p.productId)
    .filter(Boolean) as string[];

  const products = productIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, category: true },
      })
    : [];

  const categoryMap = new Map(products.map(p => [p.id, p.category]));

  const sorted = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)
    .map((p, i) => ({
      rank: i + 1,
      product: {
        name: p.name,
        image: p.image,
        category: p.productId ? (categoryMap.get(p.productId) || "Unknown") : "Unknown",
      },
      revenue: Math.round(p.revenue * 100) / 100,
      unitsSold: p.unitsSold,
      orders: p.orders,
    }));

  return success(sorted);
}
async function handleCategories(startDate: Date) {
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: { createdAt: { gte: startDate } },
      productId: { not: null },
    },
    select: {
      productId: true,
      unitPrice: true,
      quantity: true,
      orderId: true,
    },
  });

  const productIds = [...new Set(orderItems.map(i => i.productId).filter(Boolean))] as string[];
  const products = productIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, category: true },
      })
    : [];

  const categoryByProduct = new Map(products.map(p => [p.id, p.category]));

  const categoryStats = new Map<string, {
    revenue: number;
    units: number;
    orderIds: Set<string>;
  }>();

  for (const item of orderItems) {
    const category = categoryByProduct.get(item.productId || "") || "Unknown";
    const unitPrice = toNum(item.unitPrice);
    const itemRevenue = unitPrice * item.quantity;

    const existing = categoryStats.get(category);
    if (existing) {
      existing.revenue += itemRevenue;
      existing.units += item.quantity;
      existing.orderIds.add(item.orderId);
    } else {
      categoryStats.set(category, {
        revenue: itemRevenue,
        units: item.quantity,
        orderIds: new Set([item.orderId]),
      });
    }
  }

  const totalRevenue = Array.from(categoryStats.values()).reduce((sum, c) => sum + c.revenue, 0);

  const categories = Array.from(categoryStats.entries())
    .map(([category, stats]) => ({
      category,
      revenue: Math.round(stats.revenue * 100) / 100,
      units: stats.units,
      orders: stats.orderIds.size,
      percentage: totalRevenue > 0
        ? Math.round((stats.revenue / totalRevenue) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return success(categories);
}
async function handleCustomers(startDate: Date) {
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      userId: { not: null },
    },
    select: { userId: true, total: true },
  });

  const customerMap = new Map<string, { totalSpent: number; orders: number }>();
  for (const order of orders) {
    if (!order.userId) continue;
    const amount = toNum(order.total);
    const existing = customerMap.get(order.userId);
    if (existing) {
      existing.totalSpent += amount;
      existing.orders += 1;
    } else {
      customerMap.set(order.userId, { totalSpent: amount, orders: 1 });
    }
  }

  const sorted = Array.from(customerMap.entries())
    .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
    .slice(0, 20);

  const userIds = sorted.map(([id]) => id);
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, createdAt: true },
      })
    : [];

  const userMap = new Map(users.map(u => [u.id, u]));

  let newCustomers = 0;
  let returningCustomers = 0;
  let repeatCount = 0;

  for (const [userId, stats] of customerMap.entries()) {
    const user = userMap.get(userId);
    if (user && user.createdAt >= startDate) {
      newCustomers++;
    } else {
      returningCustomers++;
    }
    if (stats.orders > 1) repeatCount++;
  }

  const repeatRate = customerMap.size > 0
    ? Math.round((repeatCount / customerMap.size) * 1000) / 10
    : 0;

  const topCustomers = sorted.map(([userId, stats]) => ({
    customer: userMap.get(userId) || { name: "Unknown", email: "" },
    totalSpent: Math.round(stats.totalSpent * 100) / 100,
    orders: stats.orders,
    avgOrderValue: Math.round((stats.totalSpent / stats.orders) * 100) / 100,
  }));

  return success({
    topCustomers,
    stats: {
      newCustomers,
      returningCustomers,
      repeatRate,
      totalUniqueCustomers: customerMap.size,
    },
  });
}

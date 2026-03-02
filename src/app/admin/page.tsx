"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  TrendingDown,
  Package,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  Settings,
  Eye,
  RefreshCw,
} from "lucide-react";

// ── Types ──

interface DashboardData {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    ordersToday: number;
    revenueToday: number;
    avgOrderValue: number;
    revenueChange: number | null;
    newCustomersThisWeek: number;
    periodRevenue: number;
    ordersInPeriod: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    email: string;
    firstName: string;
    lastName: string;
    userId?: string | null;
    user?: { id: string; name: string | null; email: string } | null;
    createdAt: string;
  }>;
  revenueChart: Array<{ date: string; revenue: number }>;
  ordersChart: Array<{ date: string; orders: number }>;
  topProducts: Array<{ name: string; unitsSold: number; revenue: number }>;
  ordersByStatus: Record<string, number>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    slug: string;
    stock: number;
    unit: string;
  }>;
  recentActivity: Array<{
    id: string;
    adminId: string;
    action: string;
    entity: string;
    entityId: string | null;
    details: string | null;
    createdAt: string;
  }>;
  comparisonLabel: string;
  rangeLabel: string;
  range: string;
}

// ── Status badge config ──

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  processing: "outline",
  shipped: "secondary",
  in_transit: "secondary",
  delivered: "default",
  cancelled: "destructive",
};

const statusColors: Record<string, string> = {
  processing: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  shipped: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  in_transit: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  delivered: "bg-green-500/15 text-green-600 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-600 border-red-500/30",
};

// ── Chart configs ──

const revenueChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#EC691B",
  },
};

const topProductsChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#EC691B",
  },
};

// ── Activity entity to icon mapping ──

function getActivityIcon(entity: string) {
  switch (entity.toLowerCase()) {
    case "order":
      return <ShoppingCart className="h-4 w-4" />;
    case "product":
      return <Package className="h-4 w-4" />;
    case "user":
    case "customer":
      return <Users className="h-4 w-4" />;
    case "settings":
    case "setting":
      return <Settings className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

// ── Relative time helper ──

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Format currency ──

function fmtCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Loading skeleton ──

function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stats row skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-28 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded" />
        </CardContent>
      </Card>

      {/* Two-column skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alerts + activity skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Orders table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Dashboard ──


// ── Helpers ──

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  const fetchDashboard = useCallback(() => {
    fetch(`/api/admin/dashboard?range=${range}`, { credentials: "include" })
      .then((r) => r.json())
      .then((resp) => {
        const d = resp.data;
        if (d) {
          setData({
            stats: {
              totalOrders: d.stats?.totalOrders ?? 0,
              totalRevenue: d.stats?.totalRevenue ?? 0,
              totalCustomers: d.stats?.totalCustomers ?? 0,
              ordersToday: d.stats?.ordersToday ?? 0,
              revenueToday: d.stats?.revenueToday ?? 0,
              avgOrderValue: d.stats?.avgOrderValue ?? 0,
              revenueChange: d.stats?.revenueChange ?? null,
              newCustomersThisWeek: d.stats?.newCustomersThisWeek ?? 0,
              periodRevenue: d.stats?.periodRevenue ?? 0,
              ordersInPeriod: d.stats?.ordersInPeriod ?? 0,
            },
            recentOrders: d.recentOrders ?? [],
            revenueChart: d.revenueChart ?? [],
            ordersChart: d.ordersChart ?? [],
            topProducts: d.topProducts ?? [],
            ordersByStatus: d.ordersByStatus ?? {},
            lowStockProducts: d.lowStockProducts ?? [],
            recentActivity: d.recentActivity ?? [],
            comparisonLabel: d.comparisonLabel ?? "vs previous 30 days",
            rangeLabel: d.rangeLabel ?? "30 Days",
            range: d.range ?? "30d",
          });
          setLastUpdated(new Date());
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

  // Tick for "last updated" text
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <DashboardLoading />;

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Failed to load dashboard data
        </CardContent>
      </Card>
    );
  }

  const { stats } = data;

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm">
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/orders">
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Orders
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/coupons">
            <Package className="mr-2 h-4 w-4" />
            Coupons
          </Link>
        </Button>
      </div>

      {/* Date Range Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Dashboard Overview</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin [animation-duration:3s]" : ""}`} />
              {autoRefresh ? "Live" : "Auto-refresh"}
            </Button>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {[
            { value: "today", label: "Today" },
            { value: "7d", label: "7 Days" },
            { value: "30d", label: "30 Days" },
            { value: "90d", label: "90 Days" },
            { value: "365d", label: "Year" },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => { setRange(r.value); setLoading(true); }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmtCurrency(stats.totalRevenue)}
            </div>
            {stats.revenueChange !== null ? (
              <p className="flex items-center gap-1 text-xs">
                {stats.revenueChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span
                  className={
                    stats.revenueChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {stats.revenueChange >= 0 ? "+" : ""}
                  {stats.revenueChange.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">{data?.comparisonLabel || "vs last period"}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {fmtCurrency(stats.revenueToday)} today
              </p>
            )}
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.ordersToday} today
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalCustomers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.newCustomersThisWeek} new this week
            </p>
          </CardContent>
        </Card>

        {/* Avg Order Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmtCurrency(stats.avgOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Last {data?.rangeLabel || "30 Days"}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={revenueChartConfig}
            className="h-[300px] w-full"
          >
            <AreaChart
              data={data.revenueChart}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#EC691B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC691B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string) => {
                  const d = new Date(value + "T00:00:00");
                  return d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: number) =>
                  `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: string) => {
                      const d = new Date(value + "T00:00:00");
                      return d.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                    formatter={(value) => [
                      `$${Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}`,
                      "Revenue",
                    ]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#EC691B"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Two-column: Top Products + Orders by Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>By revenue, last {data?.rangeLabel || "30 Days"}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topProducts.length > 0 ? (
              <div className="space-y-1">
                <ChartContainer
                  config={topProductsChartConfig}
                  className="h-[220px] w-full"
                >
                  <BarChart
                    data={data.topProducts}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) =>
                        `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                      }
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={120}
                      tickFormatter={(value: string) =>
                        value.length > 16
                          ? value.slice(0, 14) + "..."
                          : value
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => [
                            `${fmtCurrency(Number(value))} (${item.payload.unitsSold} units)`,
                            "Revenue",
                          ]}
                        />
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#EC691B"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>

                {/* Ranked list below chart */}
                <div className="mt-4 space-y-2">
                  {data.topProducts.map((product, idx) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/10 text-xs font-semibold text-orange-600">
                          {idx + 1}
                        </span>
                        <span className="truncate">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-muted-foreground">
                        <span>{product.unitsSold} sold</span>
                        <span className="font-medium text-foreground">
                          {fmtCurrency(product.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No product sales data yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Distribution for last {data?.rangeLabel || "30 Days"}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.totalOrders > 0 ? (
              <div className="space-y-4">
                {Object.entries(data.ordersByStatus).map(
                  ([status, count]) => {
                    const percentage =
                      stats.totalOrders > 0
                        ? Math.round((count / stats.totalOrders) * 100)
                        : 0;
                    const label = status.replace("_", " ");
                    const colorClass =
                      statusColors[status] ??
                      "bg-gray-500/15 text-gray-600 border-gray-500/30";

                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`capitalize ${colorClass}`}
                              variant="outline"
                            >
                              {label}
                            </Badge>
                          </div>
                          <span className="text-sm font-medium">
                            {count}{" "}
                            <span className="text-muted-foreground font-normal">
                              ({percentage}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor:
                                status === "processing"
                                  ? "#eab308"
                                  : status === "shipped"
                                    ? "#3b82f6"
                                    : status === "in_transit"
                                      ? "#a855f7"
                                      : status === "delivered"
                                        ? "#22c55e"
                                        : status === "cancelled"
                                          ? "#ef4444"
                                          : "#6b7280",
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No orders yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card className="border-orange-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Low Stock Alerts</CardTitle>
            </div>
            <CardDescription>
              Products below 100g stock threshold
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {data.lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-orange-600">
                        {product.stock}
                        {product.unit} remaining
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/products/${product.slug}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Package className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-green-600">
                  All stock levels healthy
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  No products below the 100g threshold
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>Latest admin actions</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {data.recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      {getActivityIcon(entry.entity)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium capitalize">
                          {entry.action}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {entry.entity}
                        </span>
                        {entry.entityId && (
                          <span className="text-muted-foreground">
                            {" "}
                            #{entry.entityId.slice(0, 8)}
                          </span>
                        )}
                      </p>
                      {entry.details && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.details}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No activity recorded yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Latest {data.recentOrders.length} orders
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/orders">
              View all
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentOrders.map((order) => {
                const colorClass =
                  statusColors[order.status] ??
                  "bg-gray-500/15 text-gray-600 border-gray-500/30";

                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.userId ? (
                          <Link
                            href={`/admin/customers/${order.userId}`}
                            className="text-primary hover:underline"
                          >
                            {order.firstName} {order.lastName}
                          </Link>
                        ) : (
                          <span>{order.firstName} {order.lastName}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant[order.status] || "outline"}
                        className={`capitalize ${colorClass}`}
                      >
                        {order.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtCurrency(order.total ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {data.recentOrders.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    No orders yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

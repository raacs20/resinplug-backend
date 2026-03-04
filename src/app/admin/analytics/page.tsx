"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Eye,
  Users,
  MousePointerClick,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Globe,
  MapPin,
  Wallet,
  UserCheck,
  Repeat,
  DollarSign,
  RefreshCw,
  Download,
} from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

/* ══════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════ */

interface TrafficData {
  totalPageViews: number;
  uniqueVisitors: number;
  avgViewsPerVisitor: number;
  pageViewsByDay: Array<{ date: string; views: number }>;
  topPages: Array<{ url: string; views: number }>;
}

interface FunnelStage {
  stage: string;
  label: string;
  sessions: number;
  rate: number;
  overallRate: number;
}

interface FunnelData {
  funnel: FunnelStage[];
  funnelByDay: Array<Record<string, unknown>>;
  cartRate: number;
  checkoutRate: number;
  purchaseRate: number;
}

interface GeoData {
  byCountry: Array<{ country: string; orders: number; revenue: number }>;
  byProvince: Array<{ province: string; orders: number; revenue: number }>;
  byPaymentMethod: Array<{ method: string; orders: number; revenue: number }>;
  totalCountries: number;
  topCountry: string;
  topPaymentMethod: string;
}

interface CohortRow {
  cohort: string;
  signups: number;
  [key: string]: unknown;
}

interface CustomersData {
  avgLtv: number;
  repeatRate: number;
  totalCustomers: number;
  ltvDistribution: Array<{ tier: string; customers: number }>;
  cohorts: CohortRow[];
  repeatRateByMonth: Array<{ month: string; rate: number }>;
}

/* ══════════════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════════════ */

function fmtCurrency(amount: number): string {
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtMonth(monthStr: string): string {
  const d = new Date(monthStr + "-01T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const RANGES = [
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
  { value: "365", label: "Year" },
];

const GEO_COLORS = [
  "#EC691B",
  "#3B82F6",
  "#22C55E",
  "#A855F7",
  "#EF4444",
  "#F59E0B",
  "#06B6D4",
  "#EC4899",
];

/* ══════════════════════════════════════════════════════════════════════
   Chart configs
   ══════════════════════════════════════════════════════════════════════ */

const trafficChartConfig: ChartConfig = {
  views: { label: "Page Views", color: "#EC691B" },
};

const funnelTrendConfig: ChartConfig = {
  page_view: { label: "Page Views", color: "#3B82F6" },
  add_to_cart: { label: "Add to Cart", color: "#EC691B" },
  purchase: { label: "Purchase", color: "#22C55E" },
};

const ltvChartConfig: ChartConfig = {
  customers: { label: "Customers", color: "#EC691B" },
};

const repeatRateConfig: ChartConfig = {
  rate: { label: "Repeat Rate %", color: "#22C55E" },
};

/* ══════════════════════════════════════════════════════════════════════
   Loading Skeleton
   ══════════════════════════════════════════════════════════════════════ */

function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Traffic Tab
   ══════════════════════════════════════════════════════════════════════ */

function TrafficTab({
  data,
  range,
}: {
  data: TrafficData | null;
  range: string;
}) {
  if (!data) return <AnalyticsLoading />;

  const rangeLabel = RANGES.find((r) => r.value === range)?.label || "30 Days";

  function handleExport() {
    if (!data) return;
    exportToCSV(
      data.pageViewsByDay as unknown as Record<string, unknown>[],
      "traffic-analytics",
      [
        { key: "date", label: "Date" },
        { key: "views", label: "Page Views" },
      ]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalPageViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last {rangeLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Visitors
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.uniqueVisitors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last {rangeLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Views / Visitor
            </CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgViewsPerVisitor}</div>
            <p className="text-xs text-muted-foreground">Pages per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Page Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Page Views Over Time</CardTitle>
          <CardDescription>Last {rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={trafficChartConfig}
            className="h-[300px] w-full"
          >
            <AreaChart
              data={data.pageViewsByDay}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC691B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC691B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#EC691B"
                fill="url(#viewsGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
          <CardDescription>Most visited pages</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topPages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    No page view data yet
                  </TableCell>
                </TableRow>
              ) : (
                data.topPages.map((page, i) => (
                  <TableRow key={page.url}>
                    <TableCell className="font-medium text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">
                      {page.url}
                    </TableCell>
                    <TableCell className="text-right">
                      {page.views.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Funnel Tab
   ══════════════════════════════════════════════════════════════════════ */

const FUNNEL_COLORS = ["#3B82F6", "#8B5CF6", "#EC691B", "#F59E0B", "#22C55E"];

function FunnelTab({ data, range }: { data: FunnelData | null; range: string }) {
  if (!data) return <AnalyticsLoading />;

  const rangeLabel = RANGES.find((r) => r.value === range)?.label || "30 Days";

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cart Rate</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.cartRate}%</div>
            <p className="text-xs text-muted-foreground">
              Visitors who add to cart
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checkout Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.checkoutRate}%</div>
            <p className="text-xs text-muted-foreground">
              Visitors who start checkout
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.purchaseRate}%</div>
            <p className="text-xs text-muted-foreground">
              Visitors who purchase
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            Unique sessions per stage — Last {rangeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.funnel.map((stage, i) => {
              const maxSessions = data.funnel[0]?.sessions || 1;
              const widthPct = Math.max(
                (stage.sessions / maxSessions) * 100,
                4
              );
              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.label}</span>
                    <span className="text-muted-foreground">
                      {stage.sessions.toLocaleString()} sessions (
                      {stage.overallRate}%)
                    </span>
                  </div>
                  <div className="h-8 w-full rounded bg-muted/30">
                    <div
                      className="h-full rounded flex items-center px-3 text-xs font-medium text-white transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: FUNNEL_COLORS[i] || "#6B7280",
                      }}
                    >
                      {stage.sessions > 0 && stage.sessions.toLocaleString()}
                    </div>
                  </div>
                  {i > 0 && (
                    <p className="text-xs text-muted-foreground pl-1">
                      {stage.rate}% from previous stage &middot;{" "}
                      {(100 - stage.rate).toFixed(1)}% drop-off
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Funnel Trend</CardTitle>
          <CardDescription>Daily events — Last {rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={funnelTrendConfig}
            className="h-[300px] w-full"
          >
            <AreaChart
              data={data.funnelByDay}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="page_view"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="add_to_cart"
                stroke="#EC691B"
                fill="#EC691B"
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="purchase"
                stroke="#22C55E"
                fill="#22C55E"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Geographic Tab
   ══════════════════════════════════════════════════════════════════════ */

function GeoTab({ data, range }: { data: GeoData | null; range: string }) {
  if (!data) return <AnalyticsLoading />;

  const rangeLabel = RANGES.find((r) => r.value === range)?.label || "30 Days";

  function handleExport() {
    if (!data) return;
    exportToCSV(
      data.byProvince as unknown as Record<string, unknown>[],
      "geographic-analytics",
      [
        { key: "province", label: "Province / State" },
        { key: "orders", label: "Orders" },
        { key: "revenue", label: "Revenue" },
      ]
    );
  }

  const pieData = data.byCountry.slice(0, 8).map((c, i) => ({
    name: c.country,
    value: c.revenue,
    color: GEO_COLORS[i % GEO_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCountries}</div>
            <p className="text-xs text-muted-foreground">Last {rangeLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Country</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.topCountry}</div>
            <p className="text-xs text-muted-foreground">By revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top Payment Method
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {data.topPaymentMethod}
            </div>
            <p className="text-xs text-muted-foreground">Most used</p>
          </CardContent>
        </Card>
      </div>

      {/* Country Pie + Payment Method Bar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Country</CardTitle>
            <CardDescription>Order distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No order data yet
              </p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => fmtCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Revenue by method</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byPaymentMethod.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No payment data yet
              </p>
            ) : (
              <ChartContainer
                config={{
                  revenue: { label: "Revenue", color: "#3B82F6" },
                }}
                className="h-[300px] w-full"
              >
                <BarChart
                  data={data.byPaymentMethod}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="method"
                    className="text-xs capitalize"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tickFormatter={(v) => "$" + v.toLocaleString()}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => fmtCurrency(Number(value))}
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provinces Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Regions</CardTitle>
          <CardDescription>By revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Province / State</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byProvince.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No regional data yet
                  </TableCell>
                </TableRow>
              ) : (
                data.byProvince.map((p, i) => (
                  <TableRow key={p.province}>
                    <TableCell className="font-medium text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{p.province}</TableCell>
                    <TableCell className="text-right">
                      {p.orders.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtCurrency(p.revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Customers Tab
   ══════════════════════════════════════════════════════════════════════ */

function CustomersTab({ data }: { data: CustomersData | null }) {
  if (!data) return <AnalyticsLoading />;

  function handleExport() {
    if (!data) return;
    exportToCSV(
      data.ltvDistribution as unknown as Record<string, unknown>[],
      "customer-insights",
      [
        { key: "tier", label: "Spend Tier" },
        { key: "customers", label: "Customers" },
      ]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg LTV</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtCurrency(data.avgLtv)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime value per customer
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Rate</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.repeatRate}%</div>
            <p className="text-xs text-muted-foreground">
              Customers with 2+ orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalCustomers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              With at least 1 order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LTV Distribution + Repeat Rate */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>LTV Distribution</CardTitle>
            <CardDescription>Customers by spend tier</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={ltvChartConfig}
              className="h-[300px] w-full"
            >
              <BarChart
                data={data.ltvDistribution}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="tier"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="customers"
                  fill="#EC691B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repeat Rate Trend</CardTitle>
            <CardDescription>Monthly repeat purchase rate</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={repeatRateConfig}
              className="h-[300px] w-full"
            >
              <AreaChart
                data={data.repeatRateByMonth}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="repeatGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={fmtMonth}
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickFormatter={(v) => v + "%"}
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => value + "%"}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#22C55E"
                  fill="url(#repeatGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Retention Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention</CardTitle>
          <CardDescription>
            % of users who purchased in each month after signup
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.cohorts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Not enough data for cohort analysis yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead className="text-right">Signups</TableHead>
                    <TableHead className="text-center">Month 0</TableHead>
                    <TableHead className="text-center">Month 1</TableHead>
                    <TableHead className="text-center">Month 2</TableHead>
                    <TableHead className="text-center">Month 3</TableHead>
                    <TableHead className="text-center">Month 4</TableHead>
                    <TableHead className="text-center">Month 5</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cohorts.map((row) => (
                    <TableRow key={row.cohort}>
                      <TableCell className="font-medium">
                        {fmtMonth(row.cohort)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.signups}
                      </TableCell>
                      {[0, 1, 2, 3, 4, 5].map((offset) => {
                        const val = row["month_" + offset] as
                          | number
                          | undefined;
                        if (val === undefined)
                          return (
                            <TableCell
                              key={offset}
                              className="text-center text-muted-foreground"
                            >
                              —
                            </TableCell>
                          );
                        // Color intensity based on retention %
                        const intensity =
                          val > 30
                            ? "bg-green-500/30"
                            : val > 15
                              ? "bg-green-500/20"
                              : val > 5
                                ? "bg-green-500/10"
                                : "";
                        return (
                          <TableCell
                            key={offset}
                            className={`text-center ${intensity} rounded`}
                          >
                            {val}%
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main Analytics Page
   ══════════════════════════════════════════════════════════════════════ */

export default function AnalyticsPage() {
  const [range, setRange] = useState("30");
  const [activeTab, setActiveTab] = useState("traffic");
  const [loading, setLoading] = useState(true);

  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [customersData, setCustomersData] = useState<CustomersData | null>(
    null
  );

  const fetchData = useCallback(async (tab: string, dateRange: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/admin/analytics?type=" + tab + "&range=" + dateRange,
        { credentials: "include" }
      );
      const json = await res.json();
      const d = json.data;

      if (tab === "traffic") setTrafficData(d);
      else if (tab === "funnel") setFunnelData(d);
      else if (tab === "geo") setGeoData(d);
      else if (tab === "customers") setCustomersData(d);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTab, range);
  }, [activeTab, range, fetchData]);

  function handleRangeChange(newRange: string) {
    setRange(newRange);
    // Clear cached data for current tab to force skeleton
    if (activeTab === "traffic") setTrafficData(null);
    else if (activeTab === "funnel") setFunnelData(null);
    else if (activeTab === "geo") setGeoData(null);
    else if (activeTab === "customers") setCustomersData(null);
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Traffic, conversion, geographic &amp; customer insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(activeTab, range)}
            disabled={loading}
          >
            <RefreshCw
              className={"h-4 w-4" + (loading ? " animate-spin" : "")}
            />
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRangeChange(r.value)}
                className={
                  "px-3 py-1.5 text-sm rounded-md transition-colors " +
                  (range === r.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="geo">Geographic</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>
        <TabsContent value="traffic" className="mt-6">
          {loading && !trafficData ? (
            <AnalyticsLoading />
          ) : (
            <TrafficTab data={trafficData} range={range} />
          )}
        </TabsContent>
        <TabsContent value="funnel" className="mt-6">
          {loading && !funnelData ? (
            <AnalyticsLoading />
          ) : (
            <FunnelTab data={funnelData} range={range} />
          )}
        </TabsContent>
        <TabsContent value="geo" className="mt-6">
          {loading && !geoData ? (
            <AnalyticsLoading />
          ) : (
            <GeoTab data={geoData} range={range} />
          )}
        </TabsContent>
        <TabsContent value="customers" className="mt-6">
          {loading && !customersData ? (
            <AnalyticsLoading />
          ) : (
            <CustomersTab data={customersData} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

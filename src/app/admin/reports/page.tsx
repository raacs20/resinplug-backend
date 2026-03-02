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
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Download,
  RefreshCw,
  UserCheck,
  UserPlus,
  Repeat,
} from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
// ── Types ──

interface OverviewData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  repeatCustomerRate: number;
  repeatCustomers: number;
  totalUsersWithOrders: number;
  revenueByDay: Array<{ date: string; revenue: number }>;
  ordersByDay: Array<{ date: string; orders: number }>;
}

interface ProductData {
  rank: number;
  product: { name: string; image: string; category: string };
  revenue: number;
  unitsSold: number;
  orders: number;
}

interface CategoryData {
  category: string;
  revenue: number;
  units: number;
  orders: number;
  percentage: number;
}

interface CustomerItem {
  customer: { name: string | null; email: string };
  totalSpent: number;
  orders: number;
  avgOrderValue: number;
}

interface CustomersData {
  topCustomers: CustomerItem[];
  stats: {
    newCustomers: number;
    returningCustomers: number;
    repeatRate: number;
    totalUniqueCustomers: number;
  };
}

// ── Helpers ──

function fmtCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CATEGORY_COLORS: Record<string, string> = {
  Indica: "#3B82F6",
  Hybrid: "#22C55E",
  Sativa: "#EC691B",
  Unknown: "#6B7280",
};

const RANGES = [
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
  { value: "365", label: "Year" },
];

// ── Chart Configs ──

const revenueChartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "#EC691B" },
};

const ordersChartConfig: ChartConfig = {
  orders: { label: "Orders", color: "#3B82F6" },
};

const productsChartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "#EC691B" },
};
// ── Loading Skeleton ──

function ReportsLoading() {
  return (
    <div className="space-y-6">
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
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded" />
        </CardContent>
      </Card>
    </div>
  );
}
// ── Overview Tab ──

function OverviewTab({ data, range }: { data: OverviewData | null; range: string }) {
  if (!data) return <ReportsLoading />;

  const rangeLabel = RANGES.find(r => r.value === range)?.label || "30 Days";

  function handleExport() {
    if (!data) return;
    const rows = data.revenueByDay.map((d, i) => ({
      date: d.date,
      revenue: d.revenue,
      orders: data.ordersByDay[i]?.orders || 0,
    }));
    exportToCSV(rows, "overview-report", [
      { key: "date", label: "Date" },
      { key: "revenue", label: "Revenue" },
      { key: "orders", label: "Orders" },
    ]);
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtCurrency(data.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Last {rangeLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last {rangeLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last {rangeLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtCurrency(data.avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>Last {rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
            <AreaChart data={data.revenueByDay} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EC691B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC691B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={fmtDate} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={(v) => "$" + v.toLocaleString()} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtCurrency(Number(value))} />} />
              <Area type="monotone" dataKey="revenue" stroke="#EC691B" fill="url(#revenueGradient)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Orders Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Over Time</CardTitle>
          <CardDescription>Last {rangeLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={ordersChartConfig} className="h-[250px] w-full">
            <BarChart data={data.ordersByDay} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={fmtDate} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
// ── Products Tab ──

function ProductsTab({ data }: { data: ProductData[] | null }) {
  if (!data) return <ReportsLoading />;

  function handleExport() {
    if (!data) return;
    const rows = data.map(d => ({
      rank: d.rank,
      product: d.product.name,
      category: d.product.category,
      revenue: d.revenue,
      unitsSold: d.unitsSold,
      orders: d.orders,
    }));
    exportToCSV(rows, "products-report", [
      { key: "rank", label: "Rank" },
      { key: "product", label: "Product" },
      { key: "category", label: "Category" },
      { key: "revenue", label: "Revenue" },
      { key: "unitsSold", label: "Units Sold" },
      { key: "orders", label: "Orders" },
    ]);
  }

  const chartData = data.slice(0, 10).map(d => ({
    name: d.product.name.length > 20 ? d.product.name.slice(0, 20) + "..." : d.product.name,
    revenue: d.revenue,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Top Products Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Products by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={productsChartConfig} className="h-[350px] w-full">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(v) => "$" + v.toLocaleString()} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" width={95} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtCurrency(Number(value))} />} />
              <Bar dataKey="revenue" fill="#EC691B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 20 Products</CardTitle>
          <CardDescription>Ranked by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No product data for this period
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.rank}>
                    <TableCell className="font-medium">#{item.rank}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.product.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <span className="font-medium">{item.product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.product.category === "Indica" ? "bg-blue-500/15 text-blue-400" :
                        item.product.category === "Hybrid" ? "bg-green-500/15 text-green-400" :
                        item.product.category === "Sativa" ? "bg-orange-500/15 text-orange-400" :
                        "bg-gray-500/15 text-gray-400"
                      }`}>
                        {item.product.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtCurrency(item.revenue)}</TableCell>
                    <TableCell className="text-right">{item.unitsSold.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.orders.toLocaleString()}</TableCell>
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
// ── Categories Tab ──

function CategoriesTab({ data }: { data: CategoryData[] | null }) {
  if (!data) return <ReportsLoading />;

  function handleExport() {
    if (!data) return;
    exportToCSV(data as unknown as Record<string, unknown>[], "categories-report", [
      { key: "category", label: "Category" },
      { key: "revenue", label: "Revenue" },
      { key: "units", label: "Units Sold" },
      { key: "orders", label: "Orders" },
      { key: "percentage", label: "% of Total" },
    ]);
  }

  const pieData = data.map(d => ({
    name: d.category,
    value: d.revenue,
    color: CATEGORY_COLORS[d.category] || CATEGORY_COLORS.Unknown,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Donut Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Category</CardTitle>
          <CardDescription>Distribution across product categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percentage }: { name: string; percentage: number }) =>
                    name + " " + percentage.toFixed(0) + "%"
                  }
                  labelLine={true}
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
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No category data for this period
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Unknown }}
                        />
                        <span className="font-medium">{item.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtCurrency(item.revenue)}</TableCell>
                    <TableCell className="text-right">{item.units.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.orders.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.percentage}%</TableCell>
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
// ── Customers Tab ──

function CustomersTab({ data }: { data: CustomersData | null }) {
  if (!data) return <ReportsLoading />;

  function handleExport() {
    if (!data) return;
    const rows = data.topCustomers.map(d => ({
      name: d.customer.name || "Unknown",
      email: d.customer.email,
      totalSpent: d.totalSpent,
      orders: d.orders,
      avgOrderValue: d.avgOrderValue,
    }));
    exportToCSV(rows, "customers-report", [
      { key: "name", label: "Customer" },
      { key: "email", label: "Email" },
      { key: "totalSpent", label: "Total Spent" },
      { key: "orders", label: "Orders" },
      { key: "avgOrderValue", label: "Avg Order Value" },
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Customer Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalUniqueCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.newCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returning Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.returningCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Rate</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.repeatRate}%</div>
            <p className="text-xs text-muted-foreground">Customers with 2+ orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 20 Customers</CardTitle>
          <CardDescription>Ranked by total spending</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Avg Order Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No customer data for this period
                  </TableCell>
                </TableRow>
              ) : (
                data.topCustomers.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.customer.name || "Unknown"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.customer.email}</TableCell>
                    <TableCell className="text-right font-medium">{fmtCurrency(item.totalSpent)}</TableCell>
                    <TableCell className="text-right">{item.orders}</TableCell>
                    <TableCell className="text-right">{fmtCurrency(item.avgOrderValue)}</TableCell>
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
// ── Main Reports Page ──

export default function ReportsPage() {
  const [range, setRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [productsData, setProductsData] = useState<ProductData[] | null>(null);
  const [categoriesData, setCategoriesData] = useState<CategoryData[] | null>(null);
  const [customersData, setCustomersData] = useState<CustomersData | null>(null);

  const fetchData = useCallback(async (tab: string, dateRange: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/admin/reports?type=" + tab + "&range=" + dateRange,
        { credentials: "include" }
      );
      const json = await res.json();
      const d = json.data;

      if (tab === "overview") setOverviewData(d);
      else if (tab === "products") setProductsData(d);
      else if (tab === "categories") setCategoriesData(d);
      else if (tab === "customers") setCustomersData(d);
    } catch (err) {
      console.error("Failed to fetch report:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTab, range);
  }, [activeTab, range, fetchData]);

  function handleRangeChange(newRange: string) {
    setRange(newRange);
    // Clear cached data for current tab to force re-fetch
    if (activeTab === "overview") setOverviewData(null);
    else if (activeTab === "products") setProductsData(null);
    else if (activeTab === "categories") setCategoriesData(null);
    else if (activeTab === "customers") setCustomersData(null);
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab);
  }

  return (
    <div className="space-y-6">
      {/* Header with Range Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics & Reports</h2>
          <p className="text-sm text-muted-foreground">Detailed analytics for your store</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(activeTab, range)}
            disabled={loading}
          >
            <RefreshCw className={"h-4 w-4" + (loading ? " animate-spin" : "")} />
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
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          {loading && !overviewData ? <ReportsLoading /> : <OverviewTab data={overviewData} range={range} />}
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          {loading && !productsData ? <ReportsLoading /> : <ProductsTab data={productsData} />}
        </TabsContent>
        <TabsContent value="categories" className="mt-6">
          {loading && !categoriesData ? <ReportsLoading /> : <CategoriesTab data={categoriesData} />}
        </TabsContent>
        <TabsContent value="customers" className="mt-6">
          {loading && !customersData ? <ReportsLoading /> : <CustomersTab data={customersData} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

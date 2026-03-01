"use client";

import { useEffect, useState } from "react";

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  todayOrders: number;
  todayRevenue: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    email: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const d = data.data;
        setStats({
          totalOrders: d?.stats?.totalOrders ?? 0,
          totalRevenue: d?.stats?.totalRevenue ?? 0,
          totalCustomers: d?.stats?.totalCustomers ?? 0,
          todayOrders: d?.stats?.ordersToday ?? 0,
          todayRevenue: d?.stats?.revenueToday ?? 0,
          recentOrders: d?.recentOrders ?? [],
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="text-red-400">Failed to load dashboard data</div>;
  }

  const cards = [
    { label: "Total Revenue", value: `$${(stats.totalRevenue ?? 0).toFixed(2)}`, color: "text-green-400" },
    { label: "Total Orders", value: (stats.totalOrders ?? 0).toString(), color: "text-blue-400" },
    { label: "Total Customers", value: (stats.totalCustomers ?? 0).toString(), color: "text-purple-400" },
    { label: "Today's Orders", value: (stats.todayOrders ?? 0).toString(), color: "text-orange-400" },
    { label: "Today's Revenue", value: `$${(stats.todayRevenue ?? 0).toFixed(2)}`, color: "text-emerald-400" },
    {
      label: "Avg Order Value",
      value: stats.totalOrders > 0 ? `$${((stats.totalRevenue ?? 0) / stats.totalOrders).toFixed(2)}` : "$0.00",
      color: "text-yellow-400",
    },
  ];

  const statusColors: Record<string, string> = {
    processing: "bg-yellow-500/20 text-yellow-400",
    shipped: "bg-blue-500/20 text-blue-400",
    in_transit: "bg-purple-500/20 text-purple-400",
    delivered: "bg-green-500/20 text-green-400",
    cancelled: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left p-3">Order #</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="p-3 text-gray-300">{order.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[order.status] || "bg-gray-700 text-gray-300"}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 text-right font-medium">${(order.total ?? 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-gray-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">No orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

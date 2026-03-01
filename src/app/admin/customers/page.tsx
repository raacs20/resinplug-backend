"use client";

import { useEffect, useState } from "react";

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("recent");

  const fetchCustomers = () => {
    setLoading(true);
    fetch(`/api/admin/customers?page=${page}&limit=20&sort=${sort}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.data || []);
        setTotal(data.meta?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, [page, sort]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers ({total})</h1>

      <div className="flex gap-2">
        {[
          { value: "recent", label: "Most Recent" },
          { value: "orders", label: "Most Orders" },
          { value: "spent", label: "Top Spenders" },
        ].map((s) => (
          <button key={s.value} onClick={() => { setSort(s.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm ${sort === s.value ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-center p-3">Orders</th>
              <th className="text-right p-3">Total Spent</th>
              <th className="text-right p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">No customers yet</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 font-medium">{c.name || "—"}</td>
                  <td className="p-3 text-gray-300">{c.email}</td>
                  <td className="p-3 text-gray-400">{c.phone || "—"}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">{c.orderCount}</span>
                  </td>
                  <td className="p-3 text-right font-medium text-green-400">${c.totalSpent.toFixed(2)}</td>
                  <td className="p-3 text-right text-gray-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 bg-gray-800 rounded text-sm disabled:opacity-50">Prev</button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 bg-gray-800 rounded text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}

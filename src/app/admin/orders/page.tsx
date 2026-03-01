"use client";

import { useEffect, useState } from "react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  email: string;
  firstName: string;
  lastName: string;
  paymentMethod: string;
  trackingNumber: string | null;
  carrierName: string | null;
  createdAt: string;
  items: { productName: string; weight: string; quantity: number; unitPrice: number }[];
}

const STATUS_OPTIONS = ["processing", "shipped", "in_transit", "delivered", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  processing: "bg-yellow-500/20 text-yellow-400",
  shipped: "bg-blue-500/20 text-blue-400",
  in_transit: "bg-purple-500/20 text-purple-400",
  delivered: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState<{ id: string; trackingNumber: string; carrierName: string } | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/admin/orders?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.data || []);
        setTotal(data.meta?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  };

  const updateTracking = async () => {
    if (!trackingForm) return;
    await fetch(`/api/admin/orders/${trackingForm.id}/tracking`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingNumber: trackingForm.trackingNumber,
        carrierName: trackingForm.carrierName,
      }),
    });
    setTrackingForm(null);
    fetchOrders();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders ({total})</h1>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setStatusFilter(""); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm ${!statusFilter ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>All</button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${statusFilter === s ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-gray-400 p-6 text-center">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-500 p-6 text-center">No orders found</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/30" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-gray-400">{order.orderNumber}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[order.status] || ""}`}>{order.status.replace("_", " ")}</span>
                  <span className="text-sm text-gray-300">{order.firstName} {order.lastName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">${order.total.toFixed(2)}</span>
                  <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span className="text-gray-500">{expandedId === order.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {expandedId === order.id && (
                <div className="border-t border-gray-800 p-4 space-y-4">
                  {/* Items */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Items</h3>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-1">
                        <span>{item.productName} ({item.weight}) x{item.quantity}</span>
                        <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-800 mt-2">
                      <span className="text-gray-400">Subtotal</span>
                      <span>${order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Shipping</span>
                      <span>${order.shippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1">
                      <span>Total</span>
                      <span>${order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Customer info */}
                  <div className="text-sm text-gray-400">
                    <p>Email: {order.email}</p>
                    <p>Payment: {order.paymentMethod}</p>
                    {order.trackingNumber && <p>Tracking: {order.trackingNumber} ({order.carrierName})</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>

                    {trackingForm?.id === order.id ? (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Tracking #" value={trackingForm.trackingNumber}
                          onChange={(e) => setTrackingForm({ ...trackingForm, trackingNumber: e.target.value })}
                          className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white w-40" />
                        <input type="text" placeholder="Carrier" value={trackingForm.carrierName}
                          onChange={(e) => setTrackingForm({ ...trackingForm, carrierName: e.target.value })}
                          className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white w-32" />
                        <button onClick={updateTracking} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded text-sm">Save</button>
                        <button onClick={() => setTrackingForm(null)} className="px-3 py-1.5 bg-gray-700 rounded text-sm">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setTrackingForm({ id: order.id, trackingNumber: order.trackingNumber || "", carrierName: order.carrierName || "" })}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                        {order.trackingNumber ? "Edit Tracking" : "Add Tracking"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
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

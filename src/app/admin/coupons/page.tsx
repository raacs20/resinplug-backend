"use client";

import { useEffect, useState } from "react";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", discountType: "percentage", discountValue: "", minOrder: "", maxUses: "", expiresAt: "" });

  const fetchCoupons = () => {
    setLoading(true);
    fetch("/api/admin/coupons?limit=100", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCoupons(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCoupons(); }, []);

  const resetForm = () => {
    setForm({ code: "", discountType: "percentage", discountValue: "", minOrder: "", maxUses: "", expiresAt: "" });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      code: form.code,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrder: form.minOrder ? Number(form.minOrder) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
    };

    if (editId) {
      await fetch(`/api/admin/coupons/${editId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/coupons", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    resetForm();
    fetchCoupons();
  };

  const startEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrder: c.minOrder ? String(c.minOrder) : "",
      maxUses: c.maxUses ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "",
    });
    setEditId(c.id);
    setShowForm(true);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchCoupons();
  };

  const deleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE", credentials: "include" });
    fetchCoupons();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors">
          {showForm ? "Cancel" : "+ New Coupon"}
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">{editId ? "Edit Coupon" : "New Coupon"}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Code *</label>
              <input type="text" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm uppercase" placeholder="SAVE20" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type *</label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Value * {form.discountType === "percentage" ? "(%)" : "($)"}</label>
              <input type="number" step="0.01" required value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Min Order ($)</label>
              <input type="number" step="0.01" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Max Uses</label>
              <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" placeholder="Unlimited" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Expires</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium">{editId ? "Update" : "Create"} Coupon</button>
        </form>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Discount</th>
              <th className="text-left p-3">Min Order</th>
              <th className="text-center p-3">Usage</th>
              <th className="text-left p-3">Expires</th>
              <th className="text-center p-3">Active</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">No coupons yet</td></tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 font-mono font-bold text-orange-400">{c.code}</td>
                  <td className="p-3">{c.discountType === "percentage" ? `${c.discountValue}%` : `$${c.discountValue.toFixed(2)}`}</td>
                  <td className="p-3 text-gray-400">{c.minOrder ? `$${c.minOrder.toFixed(2)}` : "—"}</td>
                  <td className="p-3 text-center">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                  <td className="p-3 text-gray-400 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleActive(c.id, c.isActive)} className={`w-10 h-5 rounded-full transition-colors ${c.isActive ? "bg-green-500" : "bg-gray-700"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${c.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => startEdit(c)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Edit</button>
                      <button onClick={() => deleteCoupon(c.id, c.code)} className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProduct() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    salePrice: "",
    originalPrice: "",
    image: "",
    category: "Indica",
    thc: "",
    popularity: "0",
    featured: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salePrice: Number(form.salePrice),
          originalPrice: Number(form.originalPrice),
          popularity: Number(form.popularity),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create product");

      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-gray-400 hover:text-white">&larr;</Link>
        <h1 className="text-2xl font-bold">New Product</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Product Name *</label>
          <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Sale Price ($) *</label>
            <input type="number" step="0.01" required value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Original Price ($) *</label>
            <input type="number" step="0.01" required value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Image URL *</label>
          <input type="text" required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" placeholder="/strains/product-name.png" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
              <option value="Indica">Indica</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Sativa">Sativa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">THC % *</label>
            <input type="text" required value={form.thc} onChange={(e) => setForm({ ...form, thc: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" placeholder="24%" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Popularity Score</label>
            <input type="number" value={form.popularity} onChange={(e) => setForm({ ...form, popularity: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Featured product</span>
            </label>
          </div>
        </div>

        <p className="text-xs text-gray-500">Default variants (1g, 3g, 15g, 28g) will be auto-generated based on the sale price.</p>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
            {saving ? "Creating..." : "Create Product"}
          </button>
          <Link href="/admin/products" className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

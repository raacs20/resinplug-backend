"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    salePrice: "",
    originalPrice: "",
    image: "",
    category: "Indica",
    thc: "",
    popularity: "0",
    featured: false,
    isActive: true,
  });

  useEffect(() => {
    // Fetch all products, find the one with matching id
    fetch("/api/admin/products?limit=100", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const product = (data.data || []).find((p: { id: string }) => p.id === id);
        if (product) {
          setForm({
            name: product.name,
            slug: product.slug,
            salePrice: String(product.salePrice),
            originalPrice: String(product.originalPrice),
            image: product.image,
            category: product.category,
            thc: product.thc,
            popularity: String(product.popularity),
            featured: product.featured,
            isActive: product.isActive,
          });
        } else {
          setError("Product not found");
        }
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
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
      if (!res.ok) throw new Error(data.error?.message || "Failed to update product");

      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading product...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-gray-400 hover:text-white">&larr;</Link>
        <h1 className="text-2xl font-bold">Edit Product</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Product Name</label>
          <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Slug</label>
          <input type="text" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Sale Price ($)</label>
            <input type="number" step="0.01" required value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Original Price ($)</label>
            <input type="number" step="0.01" required value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Image URL</label>
          <input type="text" required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
              <option value="Indica">Indica</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Sativa">Sativa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">THC %</label>
            <input type="text" required value={form.thc} onChange={(e) => setForm({ ...form, thc: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Popularity</label>
            <input type="number" value={form.popularity} onChange={(e) => setForm({ ...form, popularity: e.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-green-500" />
              <span className="text-sm text-gray-300">Active</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link href="/admin/products" className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

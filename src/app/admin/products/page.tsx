"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  salePrice: number;
  originalPrice: number;
  image: string;
  category: string;
  thc: string;
  popularity: number;
  featured: boolean;
  isActive: boolean;
  createdAt: string;
  variants: { weight: string; price: number }[];
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const fetchProducts = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    fetch(`/api/admin/products?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.data || []);
        setTotal(data.meta?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [page, category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchProducts();
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !featured }),
    });
    fetchProducts();
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE", credentials: "include" });
    fetchProducts();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products ({total})</h1>
        <Link href="/admin/products/new" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors">
          + New Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500 w-64"
          />
          <button type="submit" className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Search</button>
        </form>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
        >
          <option value="">All Categories</option>
          <option value="Indica">Indica</option>
          <option value="Hybrid">Hybrid</option>
          <option value="Sativa">Sativa</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">THC</th>
              <th className="text-right p-3">Price</th>
              <th className="text-center p-3">Active</th>
              <th className="text-center p-3">Featured</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">No products found</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-gray-800" />
                      <div>
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      p.category === "Indica" ? "bg-purple-500/20 text-purple-400" :
                      p.category === "Sativa" ? "bg-green-500/20 text-green-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>{p.category}</span>
                  </td>
                  <td className="p-3 text-gray-300">{p.thc}</td>
                  <td className="p-3 text-right font-medium">${p.salePrice.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleActive(p.id, p.isActive)} className={`w-10 h-5 rounded-full transition-colors ${p.isActive ? "bg-green-500" : "bg-gray-700"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${p.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleFeatured(p.id, p.featured)} className={`w-10 h-5 rounded-full transition-colors ${p.featured ? "bg-orange-500" : "bg-gray-700"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${p.featured ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/products/${p.id}/edit`} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Edit</Link>
                      <button onClick={() => deleteProduct(p.id, p.name)} className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

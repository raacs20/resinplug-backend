"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [activeConfirm, setActiveConfirm] = useState<{ id: string; name: string; isActive: boolean } | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [page, category]);

  // Clear selection when filters or page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, category, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchProducts();
    } catch {
      toast.error("Failed to update product status");
    }
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !featured }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchProducts();
    } catch {
      toast.error("Failed to update featured status");
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Product deleted");
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  };


  const cloneProduct = async (id: string) => {
    setCloningId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}/clone`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Product cloned! The copy has been created as inactive.");
      fetchProducts();
    } catch {
      toast.error("Failed to clone product");
    } finally {
      setCloningId(null);
    }
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedProducts = useMemo(() => {
    if (!sortField) return products;
    return [...products].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortField];
      const bVal = (b as unknown as Record<string, unknown>)[sortField];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [products, sortField, sortDir]);

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const totalPages = Math.ceil(total / 20);


  // The displayed products are the sorted list used in the table
  const displayedProducts = sortedProducts;

  // Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedProducts.map(p => p.id)));
    }
  };

  // Bulk actions
  const bulkActivate = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/admin/products/${id}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          })
        )
      );
      toast.success(`${selectedIds.size} product${selectedIds.size !== 1 ? "s" : ""} activated`);
      setSelectedIds(new Set());
      fetchProducts();
    } catch {
      toast.error("Failed to activate products");
    }
  };

  const bulkDeactivate = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/admin/products/${id}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          })
        )
      );
      toast.success(`${selectedIds.size} product${selectedIds.size !== 1 ? "s" : ""} deactivated`);
      setSelectedIds(new Set());
      fetchProducts();
    } catch {
      toast.error("Failed to deactivate products");
    }
  };

  const bulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/admin/products/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
      toast.success(`${selectedIds.size} product${selectedIds.size !== 1 ? "s" : ""} deleted`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      fetchProducts();
    } catch {
      toast.error("Failed to delete products");
      setBulkDeleteOpen(false);
    }
  };
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
              <th className="p-3 w-10">
                <Checkbox
                  checked={displayedProducts.length > 0 && selectedIds.size === displayedProducts.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all products"
                />
              </th>
              <th className="text-left p-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort("name")}>Product{sortIndicator("name")}</th>
              <th className="text-left p-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort("category")}>Category{sortIndicator("category")}</th>
              <th className="text-left p-3">THCa</th>
              <th className="text-right p-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort("salePrice")}>Price{sortIndicator("salePrice")}</th>
              <th className="text-center p-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort("isActive")}>Active{sortIndicator("isActive")}</th>
              <th className="text-center p-3">Featured</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-center text-gray-500">Loading...</td></tr>
            ) : displayedProducts.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-gray-500">No products found</td></tr>
            ) : (
              displayedProducts.map((p) => (
                <tr key={p.id} className={["border-b border-gray-800/50 hover:bg-gray-800/30", selectedIds.has(p.id) ? "bg-gray-800/40" : ""].join(" ")}>
                  <td className="p-3">
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image || "/placeholder-product.svg"} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-gray-800" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.svg"; }} />
                      <div>
                        <Link href={`/admin/products/${p.id}/edit`} className="font-medium text-white hover:text-orange-400 hover:underline transition-colors">{p.name}</Link>
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
                    <button onClick={() => setActiveConfirm({ id: p.id, name: p.name, isActive: p.isActive })} className={`w-10 h-5 rounded-full transition-colors ${p.isActive ? "bg-green-500" : "bg-gray-700"}`}>
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

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-lg shadow-lg px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={bulkActivate}>
            Activate
          </Button>
          <Button size="sm" variant="outline" onClick={bulkDeactivate}>
            Deactivate
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Active Toggle Confirmation */}
      <AlertDialog open={!!activeConfirm} onOpenChange={(open) => !open && setActiveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {activeConfirm?.isActive ? "deactivate" : "activate"}{" "}
              <span className="font-medium text-foreground">{activeConfirm?.name}</span>?
              {activeConfirm?.isActive && " This will hide the product from the store."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (activeConfirm) { toggleActive(activeConfirm.id, activeConfirm.isActive); setActiveConfirm(null); } }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Product{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected product{selectedIds.size !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete {selectedIds.size} Product{selectedIds.size !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

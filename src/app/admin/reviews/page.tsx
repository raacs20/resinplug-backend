"use client";

import { useEffect, useState } from "react";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title: string | null;
  text: string;
  verified: boolean;
  helpfulCount: number;
  createdAt: string;
  product?: { name: string; image: string };
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [verifiedFilter, setVerifiedFilter] = useState<string>("");

  const fetchReviews = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (verifiedFilter) params.set("verified", verifiedFilter);

    fetch(`/api/admin/reviews?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.data || []);
        setTotal(data.meta?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReviews(); }, [page, verifiedFilter]);

  const toggleVerified = async (id: string, verified: boolean) => {
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: !verified }),
    });
    fetchReviews();
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE", credentials: "include" });
    fetchReviews();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reviews ({total})</h1>

      <div className="flex gap-2">
        <button onClick={() => { setVerifiedFilter(""); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm ${!verifiedFilter ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400"}`}>All</button>
        <button onClick={() => { setVerifiedFilter("true"); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm ${verifiedFilter === "true" ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400"}`}>Verified</button>
        <button onClick={() => { setVerifiedFilter("false"); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm ${verifiedFilter === "false" ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-400"}`}>Unverified</button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-gray-400 p-6 text-center">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="text-gray-500 p-6 text-center">No reviews found</div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-yellow-400">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span className="font-medium text-sm">{r.customerName}</span>
                    {r.verified && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">Verified</span>}
                    <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title && <p className="font-medium text-sm mb-1">{r.title}</p>}
                  <p className="text-sm text-gray-300">{r.text}</p>
                  {r.product && <p className="text-xs text-gray-500 mt-2">Product: {r.product.name}</p>}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => toggleVerified(r.id, r.verified)}
                    className={`px-2 py-1 rounded text-xs ${r.verified ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                    {r.verified ? "Unverify" : "Verify"}
                  </button>
                  <button onClick={() => deleteReview(r.id)}
                    className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
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

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Star,
  ShieldCheck,
  ShieldX,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import Link from "next/link";
import { exportToCSV } from "@/lib/csv-export";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

interface Review {
  id: string;
  customerName: string;
  userId?: string | null;
  user?: { id: string; name: string | null; email: string } | null;
  rating: number;
  title: string | null;
  text: string;
  verified: boolean;
  helpfulCount: number;
  createdAt: string;
  product?: { id: string; name: string; slug: string; image: string };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

const LIMIT = 20;

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<{ review: Review; newVerified: boolean } | null>(null);
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchReviews = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });
    if (verifiedFilter && verifiedFilter !== "all") {
      params.set("verified", verifiedFilter);
    }

    fetch(`/api/admin/reviews?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.data || []);
        setTotal(data.meta?.total || 0);
      })
      .catch(() => toast.error("Failed to load reviews"))
      .finally(() => setLoading(false));
  }, [page, verifiedFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const toggleVerified = async (id: string, verified: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !verified }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(verified ? "Review unverified" : "Review verified");
      fetchReviews();
    } catch {
      toast.error("Failed to update review verification");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/reviews/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Review deleted");
      setDeleteTarget(null);
      fetchReviews();
    } catch {
      toast.error("Failed to delete review");
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

  const sortedReviews = useMemo(() => {
    if (!sortField) return reviews;
    return [...reviews].sort((a, b) => {
      let aVal: unknown, bVal: unknown;
      if (sortField === "product") {
        aVal = a.product?.name || "";
        bVal = b.product?.name || "";
      } else {
        aVal = ((a as unknown) as Record<string, unknown>)[sortField];
        bVal = ((b as unknown) as Record<string, unknown>)[sortField];
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [reviews, sortField, sortDir]);

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
          <p className="text-sm text-muted-foreground">
            {total} total review{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            exportToCSV(
              reviews.map(r => ({
                customer: r.customerName,
                product: r.product?.name || "",
                rating: r.rating,
                title: r.title || "",
                verified: r.verified,
                date: new Date(r.createdAt).toLocaleDateString(),
              })),
              "reviews",
              [
                { key: "customer", label: "Customer" },
                { key: "product", label: "Product" },
                { key: "rating", label: "Rating" },
                { key: "title", label: "Title" },
                { key: "verified", label: "Verified" },
                { key: "date", label: "Date" },
              ]
            )
          }
        >
          <Download className="size-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={verifiedFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setVerifiedFilter("all");
            setPage(1);
          }}
        >
          All
        </Button>
        <Button
          variant={verifiedFilter === "true" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setVerifiedFilter("true");
            setPage(1);
          }}
        >
          <ShieldCheck className="size-4" />
          Verified
        </Button>
        <Button
          variant={verifiedFilter === "false" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setVerifiedFilter("false");
            setPage(1);
          }}
        >
          <ShieldX className="size-4" />
          Unverified
        </Button>
      </div>

      {/* Reviews table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("customerName")}>Customer{sortIndicator("customerName")}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("product")}>Product{sortIndicator("product")}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("rating")}>Rating{sortIndicator("rating")}</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-center">Verified</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>Date{sortIndicator("createdAt")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No reviews found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedReviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.user?.id ? (
                        <Link
                          href={`/admin/customers/${r.user.id}`}
                          className="text-primary hover:underline"
                        >
                          {r.customerName}
                        </Link>
                      ) : (
                        r.customerName
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.product?.id ? (
                        <Link
                          href={`/admin/products/${r.product.id}/edit`}
                          className="hover:underline hover:text-primary"
                        >
                          {r.product.name}
                        </Link>
                      ) : (
                        r.product?.name || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StarRating rating={r.rating} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {r.title || <span className="text-muted-foreground italic">No title</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.verified ? (
                        <Badge variant="default" className="gap-1">
                          <ShieldCheck className="size-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setVerifyTarget({ review: r, newVerified: !r.verified })}
                        >
                          {r.verified ? (
                            <>
                              <ShieldX className="size-3.5" />
                              Unverify
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="size-3.5" />
                              Verify
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Verify/Unverify Confirmation */}
      <AlertDialog
        open={!!verifyTarget}
        onOpenChange={(open) => !open && setVerifyTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Verification Change</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this review by <span className="font-medium text-foreground">{verifyTarget?.review.customerName}</span> as{" "}
              <span className="font-medium text-foreground">{verifyTarget?.newVerified ? "verified" : "unverified"}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (verifyTarget) { toggleVerified(verifyTarget.review.id, verifyTarget.review.verified); setVerifyTarget(null); } }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the review
              {deleteTarget?.title ? (
                <>
                  {" "}titled{" "}
                  <span className="font-medium">&quot;{deleteTarget.title}&quot;</span>
                </>
              ) : (
                <> by <span className="font-medium">{deleteTarget?.customerName}</span></>
              )}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

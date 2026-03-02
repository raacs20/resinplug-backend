"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Percent,
  DollarSign,
  MoreHorizontal,
  Megaphone,
  TicketPercent,
  Copy,
  Download,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Coupon types ─── */

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

interface CouponForm {
  code: string;
  discountType: string;
  discountValue: string;
  minOrder: string;
  maxUses: string;
  expiresAt: string;
}

const EMPTY_COUPON_FORM: CouponForm = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minOrder: "",
  maxUses: "",
  expiresAt: "",
};

/* ─── Automatic discount types ─── */

interface Discount {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  appliesTo: "all" | "category" | "product";
  targetIds: string[];
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

interface DiscountForm {
  name: string;
  type: "percentage" | "fixed";
  value: string;
  appliesTo: "all" | "category" | "product";
  targetIds: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const EMPTY_DISCOUNT_FORM: DiscountForm = {
  name: "",
  type: "percentage",
  value: "",
  appliesTo: "all",
  targetIds: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Discount Codes Tab
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function DiscountCodesTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(EMPTY_COUPON_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [couponErrors, setCouponErrors] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label + " copied to clipboard");
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedCoupons = useMemo(() => {
    if (!sortField) return coupons;
    return [...coupons].sort((a, b) => {
      const aVal = ((a as unknown) as Record<string, unknown>)[sortField];
      const bVal = ((b as unknown) as Record<string, unknown>)[sortField];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [coupons, sortField, sortDir]);

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const fetchCoupons = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/coupons?limit=100", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => setCoupons(data.data || []))
      .catch(() => toast.error("Failed to load discount codes"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const openCreate = () => {
    setForm(EMPTY_COUPON_FORM);
    setEditId(null);
    setCouponErrors({});
    setDialogOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setCouponErrors({});
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrder: c.minOrder ? String(c.minOrder) : "",
      maxUses: c.maxUses ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "",
    });
    setEditId(c.id);
    setDialogOpen(true);
  };

  const validateCoupon = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.code.trim() || form.code.trim().length < 3) errs.code = "Code is required (min 3 characters)";
    if (!form.discountValue || isNaN(Number(form.discountValue)) || Number(form.discountValue) <= 0)
      errs.discountValue = "Discount value must be a positive number";
    if (form.discountType === "percentage" && Number(form.discountValue) > 100)
      errs.discountValue = "Percentage must be between 1 and 100";
    if (form.expiresAt) {
      const expDate = new Date(form.expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) errs.expiresAt = "Expiration date must be in the future";
    }
    setCouponErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCoupon()) return;
    const body = {
      code: form.code,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrder: form.minOrder ? Number(form.minOrder) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
    };

    try {
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
      toast.success(editId ? "Coupon updated" : "Coupon created");
      setDialogOpen(false);
      setEditId(null);
      setForm(EMPTY_COUPON_FORM);
      fetchCoupons();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save coupon");
    }
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/admin/coupons/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      toast.success("Coupon deleted");
      setDeleteTarget(null);
      fetchCoupons();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete coupon");
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab header with Create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manual coupon codes that customers enter at checkout.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportToCSV(
                coupons.map(c => ({
                  code: c.code,
                  type: c.discountType,
                  value: c.discountType === "percentage" ? `${c.discountValue}%` : `$${c.discountValue.toFixed(2)}`,
                  minOrder: c.minOrder ? `$${c.minOrder.toFixed(2)}` : "",
                  usage: c.maxUses ? `${c.usedCount}/${c.maxUses}` : String(c.usedCount),
                  active: c.isActive,
                  expires: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never",
                })),
                "discount-codes",
                [
                  { key: "code", label: "Code" },
                  { key: "type", label: "Type" },
                  { key: "value", label: "Value" },
                  { key: "minOrder", label: "Min Order" },
                  { key: "usage", label: "Usage" },
                  { key: "active", label: "Active" },
                  { key: "expires", label: "Expires" },
                ]
              )
            }
          >
            <Download className="size-4" />
            Export
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("code")}>Code{sortIndicator("code")}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("discountType")}>Type{sortIndicator("discountType")}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("discountValue")}>Value{sortIndicator("discountValue")}</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("usedCount")}>Usage{sortIndicator("usedCount")}</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <TicketPercent className="h-8 w-8 opacity-50" />
                      <p>No discount codes yet</p>
                      <Button variant="outline" size="sm" onClick={openCreate}>
                        Create your first coupon
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedCoupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold">
                      <span className="inline-flex items-center gap-1">
                        {c.code}
                        <button onClick={() => copyToClipboard(c.code, "Coupon code")} className="ml-1 text-muted-foreground hover:text-foreground inline-flex" title="Copy coupon code">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.discountType === "percentage" ? "secondary" : "outline"}>
                        {c.discountType === "percentage" ? (
                          <Percent className="size-3" />
                        ) : (
                          <DollarSign className="size-3" />
                        )}
                        {c.discountType === "percentage" ? "Percentage" : "Fixed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.discountType === "percentage"
                        ? `${c.discountValue}%`
                        : `$${c.discountValue.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.minOrder ? `$${c.minOrder.toFixed(2)}` : "\u2014"}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.usedCount}
                      {c.maxUses ? `/${c.maxUses}` : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={c.isActive}
                        onCheckedChange={() => toggleActive(c.id, c.isActive)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
            <DialogDescription>
              {editId
                ? "Update the coupon details below."
                : "Fill in the details to create a new coupon code."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Code</Label>
                <Input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => {
                    setForm({ ...form, code: e.target.value.toUpperCase() });
                    if (couponErrors.code) setCouponErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  placeholder="SAVE20"
                  className={`uppercase ${couponErrors.code ? "border-red-500" : ""}`}
                />
                {couponErrors.code && <p className="text-sm text-red-500 mt-1">{couponErrors.code}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-type">Discount Type</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(value) =>
                    setForm({ ...form, discountType: value })
                  }
                >
                  <SelectTrigger id="coupon-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-value">
                  Value {form.discountType === "percentage" ? "(%)" : "($)"}
                </Label>
                <Input
                  id="coupon-value"
                  type="number"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => {
                    setForm({ ...form, discountValue: e.target.value });
                    if (couponErrors.discountValue) setCouponErrors((prev) => ({ ...prev, discountValue: "" }));
                  }}
                  placeholder="10"
                  className={couponErrors.discountValue ? "border-red-500" : ""}
                />
                {couponErrors.discountValue && <p className="text-sm text-red-500 mt-1">{couponErrors.discountValue}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-min-order">Min Order ($)</Label>
                <Input
                  id="coupon-min-order"
                  type="number"
                  step="0.01"
                  value={form.minOrder}
                  onChange={(e) =>
                    setForm({ ...form, minOrder: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-max-uses">Max Uses</Label>
                <Input
                  id="coupon-max-uses"
                  type="number"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm({ ...form, maxUses: e.target.value })
                  }
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-expires">Expires</Label>
                <Input
                  id="coupon-expires"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => {
                    setForm({ ...form, expiresAt: e.target.value });
                    if (couponErrors.expiresAt) setCouponErrors((prev) => ({ ...prev, expiresAt: "" }));
                  }}
                  className={couponErrors.expiresAt ? "border-red-500" : ""}
                />
                {couponErrors.expiresAt && <p className="text-sm text-red-500 mt-1">{couponErrors.expiresAt}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editId ? "Update Coupon" : "Create Coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the coupon{" "}
              <span className="font-mono font-bold">{deleteTarget?.code}</span>?
              This action cannot be undone.
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Automatic Discounts Tab
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function AutomaticDiscountsTab() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DiscountForm>(EMPTY_DISCOUNT_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null);

  // Validation
  const [discountErrors, setDiscountErrors] = useState<Record<string, string>>({});

  const fetchDiscounts = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/marketing", { credentials: "include" })
      .then((r) => {
        if (r.status === 404) {
          setDiscounts([]);
          setError(
            "Marketing API not configured yet. Discounts will appear here once the API is set up."
          );
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setDiscounts(data.data || []);
        }
      })
      .catch(() => {
        toast.error("Failed to load automatic discounts");
        setError(
          "Marketing API not configured yet. Discounts will appear here once the API is set up."
        );
        setDiscounts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const openCreateDialog = () => {
    setForm(EMPTY_DISCOUNT_FORM);
    setEditingId(null);
    setDiscountErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (discount: Discount) => {
    setDiscountErrors({});
    setForm({
      name: discount.name,
      type: discount.type,
      value: String(discount.value),
      appliesTo: discount.appliesTo,
      targetIds: discount.targetIds?.join(", ") || "",
      startDate: discount.startDate?.split("T")[0] || "",
      endDate: discount.endDate?.split("T")[0] || "",
      isActive: discount.isActive,
    });
    setEditingId(discount.id);
    setDialogOpen(true);
  };

  const validateDiscount = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)
      errs.value = "Discount value must be a positive number";
    if (form.type === "percentage" && (Number(form.value) < 1 || Number(form.value) > 100))
      errs.value = "Percentage must be between 1 and 100";
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end <= start) errs.endDate = "End date must be after start date";
    }
    setDiscountErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateDiscount()) return;
    setSubmitting(true);
    try {
      const body = {
        name: form.name,
        type: form.type,
        value: Number(form.value),
        appliesTo: form.appliesTo,
        targetIds: form.targetIds
          ? form.targetIds
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isActive: form.isActive,
      };

      const url = editingId
        ? `/api/admin/marketing/${editingId}`
        : "/api/admin/marketing";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save discount");
      toast.success(editingId ? "Discount updated" : "Discount created");
      setDialogOpen(false);
      fetchDiscounts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save discount. API may not be configured yet.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/marketing/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Discount deleted");
      setDeleteTarget(null);
      fetchDiscounts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete discount");
    }
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return "Always";
    const parts: string[] = [];
    if (start) parts.push(new Date(start).toLocaleDateString());
    if (end) parts.push(new Date(end).toLocaleDateString());
    return parts.join(" - ");
  };

  return (
    <div className="space-y-4">
      {/* Tab header with Create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Automatic discounts that apply based on rules and conditions.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportToCSV(
                discounts.map(d => ({
                  name: d.name,
                  type: d.type,
                  value: d.type === "percentage" ? `${d.value}%` : `$${d.value.toFixed(2)}`,
                  appliesTo: d.appliesTo,
                  active: d.isActive,
                  startDate: d.startDate ? new Date(d.startDate).toLocaleDateString() : "",
                  endDate: d.endDate ? new Date(d.endDate).toLocaleDateString() : "",
                })),
                "auto-discounts",
                [
                  { key: "name", label: "Name" },
                  { key: "type", label: "Type" },
                  { key: "value", label: "Value" },
                  { key: "appliesTo", label: "Applies To" },
                  { key: "active", label: "Active" },
                  { key: "startDate", label: "Start Date" },
                  { key: "endDate", label: "End Date" },
                ]
              )
            }
          >
            <Download className="size-4" />
            Export
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Discount
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Megaphone className="h-8 w-8 opacity-50" />
                      <p>{error}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : discounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Megaphone className="h-8 w-8 opacity-50" />
                      <p>No automatic discounts yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openCreateDialog}
                      >
                        Create your first discount
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {d.type === "percentage" ? (
                          <Percent className="mr-1 h-3 w-3" />
                        ) : (
                          <DollarSign className="mr-1 h-3 w-3" />
                        )}
                        {d.type === "percentage" ? "Percentage" : "Fixed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {d.type === "percentage"
                        ? `${d.value}%`
                        : `$${d.value.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {d.appliesTo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateRange(d.startDate, d.endDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={d.isActive ? "default" : "secondary"}
                      >
                        {d.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(d)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(d)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Discount" : "Create Discount"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the discount details below."
                : "Fill in the details to create a new automatic discount."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount-name">Name</Label>
              <Input
                id="discount-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (discountErrors.name) setDiscountErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Summer Sale 20% Off"
                className={discountErrors.name ? "border-red-500" : ""}
              />
              {discountErrors.name && <p className="text-sm text-red-500 mt-1">{discountErrors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(val: "percentage" | "fixed") =>
                    setForm({ ...form, type: val })
                  }
                >
                  <SelectTrigger id="discount-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-value">
                  Value {form.type === "percentage" ? "(%)" : "($)"}
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => {
                    setForm({ ...form, value: e.target.value });
                    if (discountErrors.value) setDiscountErrors((prev) => ({ ...prev, value: "" }));
                  }}
                  placeholder={form.type === "percentage" ? "20" : "10.00"}
                  className={discountErrors.value ? "border-red-500" : ""}
                />
                {discountErrors.value && <p className="text-sm text-red-500 mt-1">{discountErrors.value}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-applies">Applies To</Label>
              <Select
                value={form.appliesTo}
                onValueChange={(val: "all" | "category" | "product") =>
                  setForm({ ...form, appliesTo: val })
                }
              >
                <SelectTrigger id="discount-applies" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="category">Specific Category</SelectItem>
                  <SelectItem value="product">Specific Product</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.appliesTo !== "all" && (
              <div className="space-y-2">
                <Label htmlFor="discount-targets">
                  Target IDs (comma-separated)
                </Label>
                <Input
                  id="discount-targets"
                  value={form.targetIds}
                  onChange={(e) =>
                    setForm({ ...form, targetIds: e.target.value })
                  }
                  placeholder="id1, id2, id3"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-start">Start Date</Label>
                <Input
                  id="discount-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-end">End Date</Label>
                <Input
                  id="discount-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => {
                    setForm({ ...form, endDate: e.target.value });
                    if (discountErrors.endDate) setDiscountErrors((prev) => ({ ...prev, endDate: "" }));
                  }}
                  className={discountErrors.endDate ? "border-red-500" : ""}
                />
                {discountErrors.endDate && <p className="text-sm text-red-500 mt-1">{discountErrors.endDate}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this discount immediately
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : editingId
                  ? "Update Discount"
                  : "Create Discount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the discount{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>?
              This action cannot be undone.
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Main Promotions Page
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function AdminPromotions() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
        <p className="text-sm text-muted-foreground">
          Manage discount codes and automatic discounts
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes">
            <TicketPercent className="size-4" />
            Discount Codes
          </TabsTrigger>
          <TabsTrigger value="automatic">
            <Megaphone className="size-4" />
            Automatic Discounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes">
          <DiscountCodesTab />
        </TabsContent>

        <TabsContent value="automatic">
          <AutomaticDiscountsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

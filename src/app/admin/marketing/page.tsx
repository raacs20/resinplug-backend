"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Megaphone,
  Percent,
  DollarSign,
} from "lucide-react";

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

const EMPTY_FORM: DiscountForm = {
  name: "",
  type: "percentage",
  value: "",
  appliesTo: "all",
  targetIds: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

export default function AdminMarketing() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DiscountForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchDiscounts = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/marketing", { credentials: "include" })
      .then((r) => {
        if (r.status === 404) {
          setDiscounts([]);
          setError("Marketing API not configured yet. Discounts will appear here once the API is set up.");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setDiscounts(data.data || []);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Marketing API not configured yet. Discounts will appear here once the API is set up.");
        setDiscounts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const openCreateDialog = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEditDialog = (discount: Discount) => {
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

  const handleSubmit = async () => {
    if (!form.name || !form.value) return;
    setSubmitting(true);
    try {
      const body = {
        name: form.name,
        type: form.type,
        value: Number(form.value),
        appliesTo: form.appliesTo,
        targetIds: form.targetIds
          ? form.targetIds.split(",").map((s) => s.trim()).filter(Boolean)
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete discount "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/marketing/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Discount deleted");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground text-sm">
            Manage discounts and promotions
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Discount
        </Button>
      </div>

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
                      <p>No discounts yet</p>
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
                            onClick={() => handleDelete(d.id, d.name)}
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
                : "Fill in the details to create a new discount."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount-name">Name</Label>
              <Input
                id="discount-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Summer Sale 20% Off"
              />
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
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "percentage" ? "20" : "10.00"}
                />
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
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
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
              disabled={!form.name || !form.value || submitting}
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
    </div>
  );
}

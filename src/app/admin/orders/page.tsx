"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Download,
  Plus,
} from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
interface OrderItem {
  productName: string;
  weight: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  discount?: number;
  email: string;
  firstName: string;
  lastName: string;
  paymentMethod: string;
  trackingNumber: string | null;
  carrierName: string | null;
  notes?: string | null;
  userId?: string | null;
  createdAt: string;
  items: OrderItem[];
}

type OrderStatus =
  | "processing"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "cancelled";

const STATUS_OPTIONS: OrderStatus[] = [
  "processing",
  "shipped",
  "in_transit",
  "delivered",
  "cancelled",
];

const STATUS_BADGE_VARIANT: Record<
  OrderStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  processing: "outline",
  shipped: "secondary",
  in_transit: "secondary",
  delivered: "default",
  cancelled: "destructive",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const LIMIT = 20;

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
    const [statusConfirm, setStatusConfirm] = useState<{
    id: string;
    orderNumber: string;
    currentStatus: string;
    newStatus: string;
  } | null>(null);
  const [trackingForm, setTrackingForm] = useState<{
    id: string;
    trackingNumber: string;
    carrierName: string;
  } | null>(null);
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<{ action: string; status: string } | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/admin/orders?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.data || []);
        setTotal(data.meta?.total || 0);
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Clear selection when filters or page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Order status updated");
      fetchOrders();
    } catch {
      toast.error("Failed to update order status");
    }
  };

  const updateTracking = async () => {
    if (!trackingForm) return;
    try {
      const res = await fetch(`/api/admin/orders/${trackingForm.id}/tracking`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trackingForm.trackingNumber,
          carrierName: trackingForm.carrierName,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Tracking information saved");
      setTrackingForm(null);
      fetchOrders();
    } catch {
      toast.error("Failed to save tracking information");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label + " copied to clipboard");
  };


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
    if (selectedIds.size === sortedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedOrders.map(o => o.id)));
    }
  };

  // Bulk actions
  const bulkUpdateStatus = async (status: string) => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/admin/orders/${id}/status`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      toast.success(`${selectedIds.size} order${selectedIds.size !== 1 ? "s" : ""} marked as ${formatStatus(status).toLowerCase()}`);
      setSelectedIds(new Set());
      setBulkStatusConfirm(null);
      fetchOrders();
    } catch {
      toast.error("Failed to update order statuses");
      setBulkStatusConfirm(null);
    }
  };

  const exportSelectedToCSV = () => {
    const selectedOrders = orders.filter(o => selectedIds.has(o.id));
    exportToCSV(
      selectedOrders.map(o => ({
        orderNumber: o.orderNumber,
        customer: `${o.firstName} ${o.lastName}`,
        email: o.email,
        status: o.status,
        subtotal: o.subtotal,
        shipping: o.shippingCost,
        total: o.total,
        date: new Date(o.createdAt).toLocaleDateString(),
        trackingNumber: o.trackingNumber || "",
      })),
      "orders-selected",
      [
        { key: "orderNumber", label: "Order Number" },
        { key: "customer", label: "Customer" },
        { key: "email", label: "Email" },
        { key: "status", label: "Status" },
        { key: "subtotal", label: "Subtotal" },
        { key: "shipping", label: "Shipping" },
        { key: "total", label: "Total" },
        { key: "date", label: "Date" },
        { key: "trackingNumber", label: "Tracking Number" },
      ]
    );
    toast.success(`Exported ${selectedOrders.length} order${selectedOrders.length !== 1 ? "s" : ""} to CSV`);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedOrders = useMemo(() => {
    if (!sortField) return orders;
    return [...orders].sort((a, b) => {
      let aVal: unknown, bVal: unknown;
      if (sortField === "customer") {
        aVal = a.firstName + " " + a.lastName;
        bVal = b.firstName + " " + b.lastName;
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
  }, [orders, sortField, sortDir]);

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {total} total order{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/orders/new">
              <Plus className="size-4" />
              Create Order
            </Link>
          </Button>
        <Button
          variant="outline"
          onClick={() =>
            exportToCSV(
              orders.map(o => ({
                orderNumber: o.orderNumber,
                customer: `${o.firstName} ${o.lastName}`,
                email: o.email,
                status: o.status,
                subtotal: o.subtotal,
                shipping: o.shippingCost,
                total: o.total,
                date: new Date(o.createdAt).toLocaleDateString(),
                trackingNumber: o.trackingNumber || "",
              })),
              "orders",
              [
                { key: "orderNumber", label: "Order Number" },
                { key: "customer", label: "Customer" },
                { key: "email", label: "Email" },
                { key: "status", label: "Status" },
                { key: "subtotal", label: "Subtotal" },
                { key: "shipping", label: "Shipping" },
                { key: "total", label: "Total" },
                { key: "date", label: "Date" },
                { key: "trackingNumber", label: "Tracking Number" },
              ]
            )
          }
        >
          <Download className="size-4" />
          Export
        </Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter("all");
            setPage(1);
          }}
        >
          All
        </Button>
        {STATUS_OPTIONS.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {formatStatus(s)}
          </Button>
        ))}
      </div>

      {/* Orders table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={sortedOrders.length > 0 && selectedIds.size === sortedOrders.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all orders"
                  />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("orderNumber")}>Order{sortIndicator("orderNumber")}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("customer")}>Customer{sortIndicator("customer")}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedOrders.map((order) => {
                  const isExpanded = expandedId === order.id;
                  return (
                    <React.Fragment key={order.id}>
                          <TableRow className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                            <TableCell>
                              {isExpanded ? (
                                <ChevronUp className="size-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="size-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(order.id)}
                                onCheckedChange={() => toggleSelect(order.id)}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                aria-label={`Select order ${order.orderNumber}`}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="text-primary hover:underline inline-flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {order.orderNumber}
                                <ExternalLink className="size-3" />
                              </Link>
                              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(order.orderNumber, "Order number"); }} className="ml-1 text-muted-foreground hover:text-foreground inline-flex" title="Copy order number">
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                            <TableCell>
                              {order.userId ? (
                                <Link
                                  href={`/admin/customers/${order.userId}`}
                                  className="text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {order.firstName} {order.lastName}
                                </Link>
                              ) : (
                                <span>{order.firstName} {order.lastName}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {order.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_BADGE_VARIANT[order.status as OrderStatus] || "outline"}>
                                {formatStatus(order.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${order.total.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <div className="border-t bg-muted/30 p-6 space-y-6">
                                <div className="grid gap-6 lg:grid-cols-2">
                                  {/* Line items */}
                                  <div>
                                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                      <Package className="size-4" />
                                      Line Items
                                    </h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Product</TableHead>
                                          <TableHead>Weight</TableHead>
                                          <TableHead className="text-center">Qty</TableHead>
                                          <TableHead className="text-right">Price</TableHead>
                                          <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {order.items.map((item, i) => (
                                          <TableRow key={i}>
                                            <TableCell className="font-medium">{item.productName}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.weight}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${(item.unitPrice * item.quantity).toFixed(2)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                    <Separator className="my-3" />
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>${order.subtotal.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Shipping</span>
                                        <span>${order.shippingCost.toFixed(2)}</span>
                                      </div>
                                      {order.discount != null && order.discount > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                          <span>Discount</span>
                                          <span className="text-green-500">-${order.discount.toFixed(2)}</span>
                                        </div>
                                      )}
                                      <Separator className="my-1" />
                                      <div className="flex justify-between font-semibold">
                                        <span>Total</span>
                                        <span>${order.total.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Customer info and actions */}
                                  <div className="space-y-6">
                                    <div>
                                      <h4 className="text-sm font-medium mb-3">Customer Info</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Name</span>
                                          {order.userId ? (
                                            <Link
                                              href={`/admin/customers/${order.userId}`}
                                              className="text-primary hover:underline"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {order.firstName} {order.lastName}
                                            </Link>
                                          ) : (
                                            <span>{order.firstName} {order.lastName}</span>
                                          )}
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Email</span>
                                          <span>{order.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Payment</span>
                                          <span className="capitalize">{order.paymentMethod}</span>
                                        </div>
                                        {order.trackingNumber && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tracking</span>
                                            <span>
                                              {order.trackingNumber}
                                              {order.carrierName && (
                                                <span className="text-muted-foreground"> ({order.carrierName})</span>
                                              )}
                                            </span>
                                          </div>
                                        )}
                                        {order.notes && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Notes</span>
                                            <span className="text-right max-w-[200px]">{order.notes}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Status update */}
                                    <div>
                                      <h4 className="text-sm font-medium mb-3">Update Status</h4>
                                      <Select
                                        value={order.status}
                                        onValueChange={(value) => setStatusConfirm({ id: order.id, orderNumber: order.orderNumber, currentStatus: order.status, newStatus: value })}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {STATUS_OPTIONS.map((s) => (
                                            <SelectItem key={s} value={s}>
                                              {formatStatus(s)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Tracking info */}
                                    <div>
                                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Truck className="size-4" />
                                        Tracking Info
                                      </h4>
                                      {trackingForm?.id === order.id ? (
                                        <div className="space-y-3">
                                          <div className="space-y-2">
                                            <Label htmlFor={`tracking-${order.id}`}>Tracking Number</Label>
                                            <Input
                                              id={`tracking-${order.id}`}
                                              value={trackingForm.trackingNumber}
                                              onChange={(e) =>
                                                setTrackingForm({
                                                  ...trackingForm,
                                                  trackingNumber: e.target.value,
                                                })
                                              }
                                              placeholder="Enter tracking number"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label htmlFor={`carrier-${order.id}`}>Carrier Name</Label>
                                            <Input
                                              id={`carrier-${order.id}`}
                                              value={trackingForm.carrierName}
                                              onChange={(e) =>
                                                setTrackingForm({
                                                  ...trackingForm,
                                                  carrierName: e.target.value,
                                                })
                                              }
                                              placeholder="e.g. USPS, FedEx, UPS"
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button size="sm" onClick={updateTracking}>
                                              <Save className="size-4" />
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => setTrackingForm(null)}
                                            >
                                              <X className="size-4" />
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setTrackingForm({
                                              id: order.id,
                                              trackingNumber: order.trackingNumber || "",
                                              carrierName: order.carrierName || "",
                                            })
                                          }
                                        >
                                          <Truck className="size-4" />
                                          {order.trackingNumber ? "Edit Tracking" : "Add Tracking"}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-lg shadow-lg px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => setBulkStatusConfirm({ action: "Mark as Shipped", status: "shipped" })}>
            Mark as Shipped
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkStatusConfirm({ action: "Mark as Delivered", status: "delivered" })}>
            Mark as Delivered
          </Button>
          <Button size="sm" variant="outline" onClick={exportSelectedToCSV}>
            <Download className="size-4" />
            Export Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

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

      {/* Status Change Confirmation */}
      <AlertDialog open={!!statusConfirm} onOpenChange={(open) => !open && setStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Change order <span className="font-medium text-foreground">{statusConfirm?.orderNumber}</span> status from{" "}
              <span className="font-medium text-foreground capitalize">{statusConfirm?.currentStatus?.replace(/_/g, " ")}</span> to{" "}
              <span className="font-medium text-foreground capitalize">{statusConfirm?.newStatus?.replace(/_/g, " ")}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (statusConfirm) { updateStatus(statusConfirm.id, statusConfirm.newStatus); setStatusConfirm(null); } }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Confirmation */}
      <AlertDialog open={!!bulkStatusConfirm} onOpenChange={(open) => !open && setBulkStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update {selectedIds.size} order{selectedIds.size !== 1 ? "s" : ""} to{" "}
              <span className="font-medium text-foreground capitalize">{bulkStatusConfirm?.status?.replace(/_/g, " ")}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (bulkStatusConfirm) bulkUpdateStatus(bulkStatusConfirm.status); }}>
              {bulkStatusConfirm?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Truck,
  CreditCard,
  MapPin,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Printer,
  Hash,
  Save,
  X,
  FileText,
  Coins,
  Copy,
  DollarSign,
  MessageSquare,
  ShoppingCart,
  Send,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ── Types ──

interface OrderItem {
  id: string;
  productId?: string | null;
  productName: string;
  productImage: string;
  weight: string;
  unitPrice: number;
  quantity: number;
}

interface OrderUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  creditBalance: number;
}


interface OrderEvent {
  id: string;
  orderId: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  adminId: string | null;
  adminName: string | null;
  createdAt: string;
}

interface OrderRefund {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  notes: string | null;
  status: string;
  processedBy: string | null;
  createdAt: string;
}

interface OrderNote {
  id: string;
  orderId: string;
  note: string;
  isInternal: boolean;
  createdBy: string | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  discountAmount: number | null;
  couponCode: string | null;
  creditsUsed: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street1: string;
  street2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  paymentMethod: string;
  trackingNumber: string | null;
  carrierName: string | null;
  notes: string | null;
  userId: string | null;
  user: OrderUser | null;
  items: OrderItem[];
  events: OrderEvent[];
  refunds: OrderRefund[];
  orderNotes: OrderNote[];
  createdAt: string;
  updatedAt: string;
}

type OrderStatus =
  | "processing"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "cancelled";

// ── Constants ──

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

const STATUS_COLOR: Record<OrderStatus, string> = {
  processing: "text-yellow-500",
  shipped: "text-blue-500",
  in_transit: "text-blue-500",
  delivered: "text-green-500",
  cancelled: "text-red-500",
};

const REFUND_REASONS: { value: string; label: string }[] = [
  { value: "customer_request", label: "Customer Request" },
  { value: "defective", label: "Defective Product" },
  { value: "wrong_item", label: "Wrong Item Sent" },
  { value: "duplicate", label: "Duplicate Order" },
  { value: "other", label: "Other" },
];

// ── Helpers ──

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentStatus(orderStatus: string): {
  label: string;
  className: string;
} {
  switch (orderStatus) {
    case "cancelled":
      return { label: "Refunded / Cancelled", className: "text-red-500" };
    case "delivered":
      return { label: "Paid", className: "text-green-500" };
    default:
      return { label: "Paid", className: "text-green-500" };
  }
}



function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  return formatDateTime(dateStr);
}

function formatRefundReason(reason: string): string {
  return reason.replace(/_/g, " ").replace(/w/g, (c) => c.toUpperCase());
}

function getEventIcon(type: string) {
  switch (type) {
    case "status_change":
      return <ArrowRight className="h-4 w-4" />;
    case "tracking_added":
      return <Truck className="h-4 w-4" />;
    case "note_added":
      return <MessageSquare className="h-4 w-4" />;
    case "refund_issued":
      return <DollarSign className="h-4 w-4" />;
    case "created":
      return <ShoppingCart className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getEventLabel(event: OrderEvent): string {
  switch (event.type) {
    case "status_change": {
      const from = event.fromValue ? formatStatus(event.fromValue) : "unknown";
      const to = event.toValue ? formatStatus(event.toValue) : "unknown";
      return `Changed status from ${from} → ${to}`;
    }
    case "tracking_added":
      return `Tracking added: ${event.toValue || ""}`;
    case "note_added": {
      const noteText = event.note || "";
      const truncated =
        noteText.length > 80 ? noteText.substring(0, 80) + "..." : noteText;
      return `Note added${truncated ? `: ${truncated}` : ""}`;
    }
    case "refund_issued":
      return `Refund issued: ${event.toValue || ""}`;
    case "created":
      return "Order created";
    default:
      return event.type
        .replace(/_/g, " ")
        .replace(/w/g, (c: string) => c.toUpperCase());
  }
}

// ── Component ──

export default function AdminOrderDetail() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Tracking form state
  const [statusConfirmDetail, setStatusConfirmDetail] = useState<string | null>(null);
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [trackingSaving, setTrackingSaving] = useState(false);


  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // Notes state
  const [newNote, setNewNote] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // ── Copy Helper ──

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label + " copied to clipboard");
  };

  // ── Data Fetching ──

  const fetchOrder = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/orders/${orderId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setOrder(data.data || null);
      })
      .catch(() => toast.error("Failed to load order details"))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // ── Status Update ──

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Status updated to ${formatStatus(newStatus)}`);
      fetchOrder();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update order status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // ── Tracking Update ──

  const handleTrackingSave = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Tracking number is required");
      return;
    }
    setTrackingSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim(),
          carrierName: carrierName.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save tracking");
      toast.success("Tracking information saved");
      setShowTrackingForm(false);
      fetchOrder();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save tracking information");
    } finally {
      setTrackingSaving(false);
    }
  };


  // ── Refund Submit ──

  const handleRefundSubmit = async () => {
    if (!order) return;
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid refund amount");
      return;
    }
    if (!refundReason) {
      toast.error("Select a refund reason");
      return;
    }

    setRefundSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refunds`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          reason: refundReason,
          notes: refundNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to issue refund");
      }
      toast.success(`Refund of ${amount.toFixed(2)} issued successfully`);
      setRefundDialogOpen(false);
      setRefundAmount("");
      setRefundReason("");
      setRefundNotes("");
      fetchOrder();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to issue refund";
      toast.error(message);
    } finally {
      setRefundSubmitting(false);
    }
  };

  // ── Note Submit ──

  const handleNoteSubmit = async () => {
    if (!newNote.trim()) {
      toast.error("Note cannot be empty");
      return;
    }
    setNoteSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      toast.success("Note added");
      setNewNote("");
      fetchOrder();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add note");
    } finally {
      setNoteSubmitting(false);
    }
  };

  // ── Print ──

  const handlePrint = () => {
    window.print();
  };


  // ── Computed values ──

  const totalRefunded = order
    ? order.refunds.reduce((sum, r) => sum + r.amount, 0)
    : 0;
  const remainingRefundable = order ? order.total - totalRefunded : 0;
  const isFullyRefunded = order ? totalRefunded >= order.total : false;

  // ── Loading State ──

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-20" />
        </div>
        {/* Actions skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
        {/* Two columns skeleton */}
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-5 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Not Found ──

  if (!order) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold">Order not found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              The order you are looking for does not exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paymentStatus = getPaymentStatus(order.status);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* ── Header ── */}
      <div className="space-y-1 print:hidden">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight font-mono inline-flex items-center gap-2">
            {order.orderNumber}
            <button onClick={() => copyToClipboard(order.orderNumber, "Order number")} className="text-muted-foreground hover:text-foreground inline-flex" title="Copy order number">
              <Copy className="h-4 w-4" />
            </button>
          </h1>
          <Badge
            variant={
              STATUS_BADGE_VARIANT[order.status as OrderStatus] || "outline"
            }
          >
            {formatStatus(order.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(order.createdAt)}
        </p>
      </div>

      {/* ── Status & Actions Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center print:hidden">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Status:
          </span>
          <Badge
            variant={
              STATUS_BADGE_VARIANT[order.status as OrderStatus] || "outline"
            }
            className="text-sm px-3 py-1"
          >
            {formatStatus(order.status)}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={order.status}
            onValueChange={(val) => setStatusConfirmDetail(val)}
            disabled={statusUpdating}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print Invoice
          </Button>
        </div>
      </div>

      {/* ── Two-Column Layout ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* ── Left Column ── */}
        <div className="space-y-6">
          {/* Order Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="relative h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.productImage || "/placeholder-product.svg"}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.svg"; }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.productId ? (
                          <Link
                            href={`/admin/products/${item.productId}/edit`}
                            className="text-primary hover:underline"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          item.productName
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.weight}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="px-6 py-4">
                <Separator className="mb-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>
                      {order.shippingCost > 0
                        ? `$${order.shippingCost.toFixed(2)}`
                        : "Free"}
                    </span>
                  </div>
                  {order.discountAmount != null && order.discountAmount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Discount
                        {order.couponCode && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {order.couponCode}
                          </Badge>
                        )}
                      </span>
                      <span className="text-green-500">
                        -${order.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {order.creditsUsed != null && order.creditsUsed > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        Credits Used
                      </span>
                      <span className="text-green-500">
                        -${order.creditsUsed.toFixed(2)}
                      </span>
                    </div>
                  )}
                                    {totalRefunded > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Total Refunded
                      </span>
                      <span className="text-red-500">-${totalRefunded.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline Card - Dynamic */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.events.length === 0 ? (
                <div className="text-center py-4">
                  <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No events recorded yet. Events will appear here as the order
                    is updated.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {order.events.map((event, index) => (
                    <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="relative flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
                          {getEventIcon(event.type)}
                        </div>
                        {index < order.events.length - 1 && (
                          <div className="absolute top-8 w-0.5 h-full bg-border" />
                        )}
                      </div>
                      <div className="pt-1 min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {getEventLabel(event)}
                        </p>
                        {event.note && event.type !== "note_added" && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.note}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(event.createdAt)}
                          </p>
                          {event.adminName && (
                            <span className="text-xs text-muted-foreground">
                              by {event.adminName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">
          {/* Customer Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Name</p>
                {order.user && order.userId ? (
                  <Link
                    href={`/admin/customers/${order.userId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {order.firstName} {order.lastName}
                  </Link>
                ) : (
                  <p className="font-medium">
                    {order.firstName} {order.lastName}
                  </p>
                )}
              </div>
              <Separator />
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium break-all">{order.email}</p>
              </div>
              <Separator />
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{order.phone || "\u2014"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <p className="font-medium">
                  {order.firstName} {order.lastName}
                </p>
                <p className="text-muted-foreground">{order.street1}</p>
                {order.street2 && (
                  <p className="text-muted-foreground">{order.street2}</p>
                )}
                <p className="text-muted-foreground">
                  {order.city}, {order.province} {order.postalCode}
                </p>
                <p className="text-muted-foreground">{order.country}</p>
                {order.phone && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-muted-foreground">{order.phone}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Method</p>
                <p className="font-medium capitalize">{order.paymentMethod}</p>
              </div>
              <Separator />
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Payment Status</p>
                <p className={`font-medium ${paymentStatus.className}`}>
                  {paymentStatus.label}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4" />
                Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showTrackingForm ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="tracking-number">Tracking Number</Label>
                    <Input
                      id="tracking-number"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carrier-name">Carrier Name</Label>
                    <Input
                      id="carrier-name"
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      placeholder="e.g. USPS, FedEx, UPS, Canada Post"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleTrackingSave}
                      disabled={trackingSaving}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {trackingSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowTrackingForm(false);
                        setTrackingNumber(order.trackingNumber || "");
                        setCarrierName(order.carrierName || "");
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : order.trackingNumber ? (
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">
                      Tracking Number
                    </p>
                    <p className="font-mono font-medium inline-flex items-center gap-1">
                      {order.trackingNumber}
                      <button onClick={() => copyToClipboard(order.trackingNumber || "", "Tracking number")} className="text-muted-foreground hover:text-foreground inline-flex" title="Copy tracking number">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </p>
                  </div>
                  {order.carrierName && (
                    <>
                      <Separator />
                      <div className="text-sm">
                        <p className="text-xs text-muted-foreground">Carrier</p>
                        <p className="font-medium">{order.carrierName}</p>
                      </div>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 print:hidden"
                    onClick={() => {
                      setTrackingNumber(order.trackingNumber || "");
                      setCarrierName(order.carrierName || "");
                      setShowTrackingForm(true);
                    }}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Edit Tracking
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    No tracking information yet.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="print:hidden"
                    onClick={() => {
                      setTrackingNumber("");
                      setCarrierName("");
                      setShowTrackingForm(true);
                    }}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Add Tracking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Refund Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                Refunds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Total</span>
                  <span className="font-medium">${order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Refunded</span>
                  <span className={`font-medium ${totalRefunded > 0 ? "text-red-500" : ""}`}>${totalRefunded.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refundable</span>
                  <span className="font-medium">${remainingRefundable.toFixed(2)}</span>
                </div>
              </div>

              {order.refunds.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Refund History</p>
                  {order.refunds.map((refund) => (
                    <div key={refund.id} className="rounded-md border p-3 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm text-red-500">-${refund.amount.toFixed(2)}</span>
                        <Badge variant="outline" className="text-xs">{refund.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatRefundReason(refund.reason)}</p>
                      {refund.notes && (<p className="text-xs text-muted-foreground italic">{refund.notes}</p>)}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(refund.createdAt)}</span>
                        {refund.processedBy && (<span>by {refund.processedBy}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="print:hidden">
                <Dialog open={refundDialogOpen} onOpenChange={(open) => { setRefundDialogOpen(open); if (open) { setRefundAmount(remainingRefundable.toFixed(2)); setRefundReason(""); setRefundNotes(""); } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full" disabled={isFullyRefunded}>
                      <DollarSign className="h-4 w-4 mr-1" />
                      {isFullyRefunded ? "Fully Refunded" : "Issue Refund"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Issue Refund</DialogTitle>
                      <DialogDescription>
                        Issue a refund for order {order.orderNumber}. Maximum refundable: ${remainingRefundable.toFixed(2)}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="refund-amount">Amount ($)</Label>
                        <Input id="refund-amount" type="number" step="0.01" min="0.01" max={remainingRefundable} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="refund-reason">Reason</Label>
                        <Select value={refundReason} onValueChange={setRefundReason}>
                          <SelectTrigger id="refund-reason"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                          <SelectContent>
                            {REFUND_REASONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="refund-notes">Notes (optional)</Label>
                        <Textarea id="refund-notes" value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} placeholder="Additional notes about the refund..." rows={3} />
                      </div>
                    </div>
                    <DialogFooter showCloseButton={false}>
                      <Button variant="outline" onClick={() => setRefundDialogOpen(false)} disabled={refundSubmitting}>Cancel</Button>
                      <Button onClick={handleRefundSubmit} disabled={refundSubmitting}>
                        {refundSubmitting ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processing...</>) : (<><DollarSign className="h-4 w-4 mr-1" />Issue Refund</>)}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Order Notes Card - Dynamic */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Order Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.orderNotes.length > 0 ? (
                <div className="space-y-3">
                  {order.orderNotes.map((note) => (
                    <div key={note.id} className="rounded-md border p-3 space-y-1">
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(note.createdAt)}</span>
                        {note.createdBy && <span>by {note.createdBy}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No notes for this order.</p>
              )}
              {order.notes && order.orderNotes.length === 0 && (
                <div className="rounded-md border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Note</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
                </div>
              )}
              <div className="print:hidden">
                <Separator className="mb-3" />
                <div className="space-y-2">
                  <Label htmlFor="new-note" className="text-xs">Add a Note</Label>
                  <Textarea id="new-note" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write a note about this order..." rows={3} />
                  <Button size="sm" onClick={handleNoteSubmit} disabled={noteSubmitting || !newNote.trim()} className="w-full">
                    {noteSubmitting ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving...</>) : (<><Send className="h-4 w-4 mr-1" />Add Note</>)}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Confirmation */}
      <AlertDialog open={!!statusConfirmDetail} onOpenChange={(open) => !open && setStatusConfirmDetail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Change order <span className="font-medium text-foreground">{order?.orderNumber}</span> status from{" "}
              <span className="font-medium text-foreground capitalize">{order?.status?.replace(/_/g, " ")}</span> to{" "}
              <span className="font-medium text-foreground capitalize">{statusConfirmDetail?.replace(/_/g, " ")}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (statusConfirmDetail) { handleStatusChange(statusConfirmDetail); setStatusConfirmDetail(null); } }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

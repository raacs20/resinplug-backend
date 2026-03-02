"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Coins,
  Calendar,
  User,
  Mail,
  Phone,
  Plus,
  MessageSquare,
  Clock,
  Shield,
  Package,
  Copy,
} from "lucide-react";

// ── Types ──

interface OrderItem {
  productName: string;
  weight: string;
  unitPrice: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

interface CreditEntry {
  id: string;
  amount: number;
  type: string;
  reason: string | null;
  createdAt: string;
}

interface CustomerNote {
  id: string;
  note: string;
  createdBy: string;
  adminName: string;
  createdAt: string;
}

interface CustomerStats {
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
  daysSinceLastOrder: number | null;
}

interface CustomerDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  creditBalance: number;
  createdAt: string;
  orders: Order[];
  creditHistory: CreditEntry[];
  stats: CustomerStats;
}

// ── Constants ──

const CREDIT_TYPES = [
  { value: "earned", label: "Earned" },
  { value: "spent", label: "Spent" },
  { value: "refund", label: "Refund" },
  { value: "manual", label: "Manual Adjustment" },
] as const;

type OrderStatus =
  | "processing"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "cancelled";

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

const CREDIT_TYPE_VARIANT: Record<string, string> = {
  earned: "bg-green-500/15 text-green-500 border-green-500/20",
  spent: "bg-red-500/15 text-red-500 border-red-500/20",
  refund: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  manual: "bg-orange-500/15 text-orange-500 border-orange-500/20",
};

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

function daysBetween(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ── Component ──

export default function AdminCustomerDetail() {
  const params = useParams();
  const customerId = params.id as string;

  // Data state
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);

  // Credit dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditType, setCreditType] = useState("manual");
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  // Ban state
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [banning, setBanning] = useState(false);

  // Note dialog state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // ── Copy Helper ──

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label + " copied to clipboard");
  };

  // ── Data Fetching ──

  const fetchCustomer = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/customers/${customerId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setCustomer(data.data || null);
      })
      .catch(() => toast.error("Failed to load customer details"))
      .finally(() => setLoading(false));
  }, [customerId]);

  const fetchNotes = useCallback(() => {
    setNotesLoading(true);
    fetch(`/api/admin/customers/${customerId}/notes`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setNotes(data.data || []);
      })
      .catch(() => toast.error("Failed to load customer notes"))
      .finally(() => setNotesLoading(false));
  }, [customerId]);

  useEffect(() => {
    fetchCustomer();
    fetchNotes();
  }, [fetchCustomer, fetchNotes]);

  // ── Credit Submit ──

  const handleCreditSubmit = async () => {
    if (!creditAmount) return;
    setCreditSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/customers/${customerId}/credits`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(creditAmount),
            reason: creditReason,
            type: creditType,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to adjust credit");
      toast.success("Credit adjusted successfully");
      setCreditDialogOpen(false);
      setCreditAmount("");
      setCreditReason("");
      setCreditType("manual");
      fetchCustomer();
    } catch (err) {
      console.error(err);
      toast.error("Failed to adjust credit");
    } finally {
      setCreditSubmitting(false);
    }
  };

  // ── Note Submit ──

  const handleNoteSubmit = async () => {
    if (!noteText.trim()) return;
    setNoteSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/customers/${customerId}/notes`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: noteText }),
        }
      );
      if (!res.ok) throw new Error("Failed to add note");
      toast.success("Note added successfully");
      setNoteDialogOpen(false);
      setNoteText("");
      fetchNotes();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add note");
    } finally {
      setNoteSubmitting(false);
    }
  };

  // ── Loading State ──

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold">Customer not found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              The customer you are looking for does not exist or has been
              removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysAsCustomer = daysBetween(customer.createdAt);
  const lastOrderDate =
    customer.orders.length > 0 ? customer.orders[0].createdAt : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.name || "Unnamed Customer"}
            </h1>
            <Badge
              variant={customer.role === "admin" ? "default" : "secondary"}
            >
              {customer.role === "admin" ? (
                <Shield className="mr-1 h-3 w-3" />
              ) : (
                <User className="mr-1 h-3 w-3" />
              )}
              {customer.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1">{customer.email}
            <button onClick={() => copyToClipboard(customer.email, "Customer email")} className="text-muted-foreground hover:text-foreground inline-flex" title="Copy email">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </p>
        </div>
        <Button onClick={() => setCreditDialogOpen(true)}>
          <Coins className="mr-1 h-4 w-4" />
          Adjust Credit
        </Button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ${customer.stats.totalSpent.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {customer.stats.orderCount}
            </div>
            {customer.stats.daysSinceLastOrder !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                Last order {customer.stats.daysSinceLastOrder} day
                {customer.stats.daysSinceLastOrder !== 1 ? "s" : ""} ago
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              ${customer.stats.avgOrderValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credit Balance
            </CardTitle>
            <Coins className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {customer.creditBalance}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content: Tabs + Sidebar ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── Tabs ── */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">
              <ShoppingCart className="mr-1 h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="credits">
              <Coins className="mr-1 h-4 w-4" />
              Credits
            </TabsTrigger>
            <TabsTrigger value="notes">
              <MessageSquare className="mr-1 h-4 w-4" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* ── Orders Tab ── */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>
                  {customer.orders.length} order
                  {customer.orders.length !== 1 ? "s" : ""} placed
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 opacity-50" />
                            <p>No orders yet</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      customer.orders.map((order) => {
                        const itemCount = order.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        );
                        return (
                          <TableRow
                            key={order.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              (window.location.href = `/admin/orders/${order.id}`)
                            }
                          >
                            <TableCell className="font-mono text-xs">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  STATUS_BADGE_VARIANT[
                                    order.status as OrderStatus
                                  ] || "outline"
                                }
                              >
                                {formatStatus(order.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{itemCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${order.total.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs">
                              {formatDate(order.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Credits Tab ── */}
          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Credit History</CardTitle>
                    <CardDescription>
                      Current balance:{" "}
                      <span className="font-medium text-foreground">
                        {customer.creditBalance} credits
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setCreditDialogOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Adjust Credit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.creditHistory.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Coins className="h-8 w-8 opacity-50" />
                            <p>No credit history</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      customer.creditHistory.map((credit) => {
                        const isPositive =
                          credit.type !== "spent" && credit.amount >= 0;
                        return (
                          <TableRow key={credit.id}>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatDateTime(credit.createdAt)}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                                  CREDIT_TYPE_VARIANT[credit.type] ||
                                  "bg-muted text-muted-foreground"
                                }`}
                              >
                                {credit.type.charAt(0).toUpperCase() +
                                  credit.type.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                isPositive
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {credit.amount}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                              {credit.reason || "\u2014"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notes Tab ── */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Admin Notes</CardTitle>
                    <CardDescription>
                      Internal notes about this customer
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setNoteDialogOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ))}
                  </div>
                ) : notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 opacity-50 mb-2" />
                    <p>No notes yet</p>
                    <p className="text-xs mt-1">
                      Add a note to keep track of customer interactions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {note.adminName}
                          </span>
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {note.note}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">
                    {customer.phone || "\u2014"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Account Created
                  </p>
                  <p className="font-medium">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Days as Customer
                  </p>
                  <p className="font-medium">
                    {daysAsCustomer} day{daysAsCustomer !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{customer.role}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3 text-sm">
                <ShoppingCart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Last Order
                  </p>
                  <p className="font-medium">
                    {lastOrderDate ? formatDate(lastOrderDate) : "Never"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-all inline-flex items-center gap-1">{customer.email}
                    <button onClick={() => copyToClipboard(customer.email, "Customer email")} className="text-muted-foreground hover:text-foreground inline-flex flex-shrink-0" title="Copy email">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Customer ID</p>
                  <p className="font-mono text-xs font-medium inline-flex items-center gap-1">{customer.id}
                    <button onClick={() => copyToClipboard(customer.id, "Customer ID")} className="text-muted-foreground hover:text-foreground inline-flex flex-shrink-0" title="Copy customer ID">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Credit Adjustment Dialog ── */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credit</DialogTitle>
            <DialogDescription>
              Adjust credit balance for{" "}
              <span className="font-medium text-foreground">
                {customer.name || customer.email}
              </span>
              . Current balance:{" "}
              <span className="font-medium text-foreground">
                {customer.creditBalance} credits
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-type">Type</Label>
              <Select value={creditType} onValueChange={setCreditType}>
                <SelectTrigger id="credit-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CREDIT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount</Label>
              <Input
                id="credit-amount"
                type="number"
                placeholder="Enter credit amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-reason">Reason</Label>
              <Textarea
                id="credit-reason"
                placeholder="Reason for adjustment..."
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreditSubmit}
              disabled={!creditAmount || creditSubmitting}
            >
              {creditSubmitting ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Note Dialog ── */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add an internal note about{" "}
              <span className="font-medium text-foreground">
                {customer.name || customer.email}
              </span>
              . Notes are only visible to admins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-text">Note</Label>
              <Textarea
                id="note-text"
                placeholder="Write your note here..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNoteSubmit}
              disabled={!noteText.trim() || noteSubmitting}
            >
              {noteSubmitting ? "Saving..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

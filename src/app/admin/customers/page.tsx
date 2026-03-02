"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Coins,
  Users,
  Download,
} from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  creditBalance: number;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "orders", label: "Most Orders" },
  { value: "spent", label: "Top Spenders" },
] as const;

const CREDIT_TYPES = [
  { value: "earned", label: "Earned" },
  { value: "spent", label: "Spent" },
  { value: "refund", label: "Refund" },
  { value: "manual", label: "Manual Adjustment" },
] as const;

const PAGE_SIZE = 20;

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Credit dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditType, setCreditType] = useState("manual");
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const [creditConfirmOpen, setCreditConfirmOpen] = useState(false);

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort,
    });
    if (search) params.set("search", search);

    fetch(`/api/admin/customers?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.data || []);
        setTotal(data.meta?.total || 0);
      })
      .catch(() => toast.error("Failed to load customers"))
      .finally(() => setLoading(false));
  }, [page, sort, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedCustomers = useMemo(() => {
    if (!sortField) return customers;
    return [...customers].sort((a, b) => {
      let aVal: unknown, bVal: unknown;
      if (sortField === "orderCount") {
        aVal = a.orderCount;
        bVal = b.orderCount;
      } else if (sortField === "totalSpent") {
        aVal = a.totalSpent;
        bVal = b.totalSpent;
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
  }, [customers, sortField, sortDir]);

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const openCreditDialog = (customer: Customer) => {
    setCreditCustomer(customer);
    setCreditAmount("");
    setCreditReason("");
    setCreditType("manual");
    setCreditDialogOpen(true);
  };

  const handleCreditSubmit = async () => {
    if (!creditCustomer || !creditAmount) return;
    setCreditSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/customers/${creditCustomer.id}/credits`,
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
      fetchCustomers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to adjust credit");
    } finally {
      setCreditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">
            {total} total customers
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            exportToCSV(
              customers.map(c => ({
                name: c.name || "",
                email: c.email,
                phone: c.phone || "",
                orders: c.orderCount,
                totalSpent: c.totalSpent,
                creditBalance: c.creditBalance,
                joined: new Date(c.createdAt).toLocaleDateString(),
              })),
              "customers",
              [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                { key: "orders", label: "Orders" },
                { key: "totalSpent", label: "Total Spent" },
                { key: "creditBalance", label: "Credit Balance" },
                { key: "joined", label: "Joined" },
              ]
            )
          }
        >
          <Download className="size-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="secondary" size="default">
            Search
          </Button>
        </form>
        <Select
          value={sort}
          onValueChange={(val) => {
            setSort(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>Customer{sortIndicator("name")}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("orderCount")}>Orders{sortIndicator("orderCount")}</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("totalSpent")}>Total Spent{sortIndicator("totalSpent")}</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>Joined{sortIndicator("createdAt")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 opacity-50" />
                      <p>No customers found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="text-primary hover:underline"
                      >
                        {c.name || c.email}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="hover:underline hover:text-primary"
                      >
                        {c.email}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone || "\u2014"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{c.orderCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      ${c.totalSpent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">
                        <Coins className="mr-1 h-3 w-3" />
                        {c.creditBalance ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreditDialog(c)}
                      >
                        <Coins className="mr-1 h-3 w-3" />
                        Adjust Credit
                      </Button>
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
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Credit Adjustment Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credit</DialogTitle>
            <DialogDescription>
              Adjust credit balance for{" "}
              <span className="font-medium text-foreground">
                {creditCustomer?.name || creditCustomer?.email}
              </span>
              . Current balance:{" "}
              <span className="font-medium text-foreground">
                {creditCustomer?.creditBalance ?? 0} credits
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
              onClick={() => setCreditConfirmOpen(true)}
              disabled={!creditAmount || creditSubmitting}
            >
              {creditSubmitting ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Adjustment Confirmation */}
      <AlertDialog open={creditConfirmOpen} onOpenChange={setCreditConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Credit Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to adjust{" "}
              <span className="font-medium text-foreground">{creditCustomer?.name || creditCustomer?.email}</span>&apos;s credit by{" "}
              <span className="font-medium text-foreground">{creditAmount} credits</span> ({creditType})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCreditConfirmOpen(false); handleCreditSubmit(); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

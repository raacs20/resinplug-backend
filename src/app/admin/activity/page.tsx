"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

interface ActivityEntry {
  id: string;
  createdAt: string;
  adminEmail: string;
  adminName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
}

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "order", label: "Orders" },
  { value: "product", label: "Products" },
  { value: "customer", label: "Customers" },
  { value: "coupon", label: "Coupons" },
  { value: "settings", label: "Settings" },
  { value: "review", label: "Reviews" },
  { value: "discount", label: "Discounts" },
  { value: "seo", label: "SEO" },
] as const;

const ACTION_COLORS: Record<string, string> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  login: "outline",
};

const PAGE_SIZE = 20;

export default function AdminActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState("all");
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchActivity = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (entityFilter !== "all") params.set("entity", entityFilter);

    fetch(`/api/admin/activity?${params}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 404) {
          setEntries([]);
          setTotal(0);
          setError(
            "Activity log API not configured yet. Activity will appear here once the API is set up."
          );
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setEntries(data.data || []);
          setTotal(data.meta?.total || 0);
        }
      })
      .catch((err) => {
        console.error(err);
        setEntries([]);
        setTotal(0);
        setError(
          "Activity log API not configured yet. Activity will appear here once the API is set up."
        );
      })
      .finally(() => setLoading(false));
  }, [page, entityFilter]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedEntries = useMemo(() => {
    if (!sortField) return entries;
    return [...entries].sort((a, b) => {
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
  }, [entries, sortField, sortDir]);

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getActionVariant = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("delete") || lower.includes("remove"))
      return "destructive" as const;
    if (lower.includes("create") || lower.includes("add"))
      return "default" as const;
    if (lower.includes("update") || lower.includes("edit"))
      return "secondary" as const;
    return "outline" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground text-sm">
            Track admin actions and changes
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select
          value={entityFilter}
          onValueChange={(val) => {
            setEntityFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-500">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>Date / Time{sortIndicator("createdAt")}</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("action")}>Action{sortIndicator("action")}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("entity")}>Entity{sortIndicator("entity")}</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardList className="h-10 w-10 opacity-50" />
                      <div>
                        <p className="font-medium">No activity logged yet</p>
                        <p className="text-sm">
                          Admin actions will appear here as they occur.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedEntries.map((entry) => {
                  const dt = formatDateTime(entry.createdAt);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{dt.date}</span>
                          <span className="text-xs text-muted-foreground">
                            {dt.time}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {entry.adminName || "\u2014"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.adminEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionVariant(entry.action)}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {entry.entity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entry.entityId || "\u2014"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {entry.details || "\u2014"}
                      </TableCell>
                    </TableRow>
                  );
                })
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
    </div>
  );
}

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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Mail,
  Send,
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ── Types ── */

interface EmailTypeConfig {
  type: string;
  label: string;
  description: string;
  enabled: boolean;
  recipient: string;
}

interface EmailLogEntry {
  id: string;
  type: string;
  to: string;
  subject: string;
  status: string;
  error: string | null;
  orderId: string | null;
  userId: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: EmailLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ── Helpers ── */

const API = process.env.NEXT_PUBLIC_API_URL || "";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEmailType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ── Main Page ── */

export default function EmailPage() {
  const [emailTypes, setEmailTypes] = useState<EmailTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);

  // Test email dialog
  const [testDialog, setTestDialog] = useState<{
    open: boolean;
    type: string;
    label: string;
  }>({ open: false, type: "", label: "" });
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  /* ── Fetch email types ── */

  const fetchEmailTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/email`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.data) setEmailTypes(json.data);
    } catch {
      toast.error("Failed to load email settings");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch logs ── */

  const fetchLogs = useCallback(async (page: number) => {
    setLogsLoading(true);
    try {
      const res = await fetch(
        `${API}/api/admin/email/logs?page=${page}&pageSize=15`,
        { credentials: "include" }
      );
      const json = await res.json();
      const data = json.data as LogsResponse;
      setLogs(data.logs);
      setLogsTotalPages(data.totalPages);
      setLogsTotal(data.total);
      setLogsPage(data.page);
    } catch {
      toast.error("Failed to load email logs");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmailTypes();
  }, [fetchEmailTypes]);

  /* ── Toggle enabled ── */

  async function handleToggle(type: string, enabled: boolean) {
    setUpdating(type);
    try {
      const res = await fetch(`${API}/api/admin/email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, enabled }),
      });
      if (res.ok) {
        setEmailTypes((prev) =>
          prev.map((et) => (et.type === type ? { ...et, enabled } : et))
        );
        toast.success(`${enabled ? "Enabled" : "Disabled"} email`);
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(null);
    }
  }

  /* ── Change recipient ── */

  async function handleRecipientChange(type: string, recipient: string) {
    setUpdating(type);
    try {
      const res = await fetch(`${API}/api/admin/email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, recipient }),
      });
      if (res.ok) {
        setEmailTypes((prev) =>
          prev.map((et) => (et.type === type ? { ...et, recipient } : et))
        );
        toast.success("Recipient updated");
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(null);
    }
  }

  /* ── Send test email ── */

  async function handleTestSend() {
    if (!testEmail) return;
    setTestSending(true);
    try {
      const res = await fetch(`${API}/api/admin/email/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: testDialog.type, to: testEmail }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.data?.message || "Test email sent!");
        setTestDialog({ open: false, type: "", label: "" });
        setTestEmail("");
      } else {
        toast.error(json.error?.message || "Failed to send test email");
      }
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setTestSending(false);
    }
  }

  /* ── Render ── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email</h1>
        <p className="text-muted-foreground text-sm">
          Manage transactional email notifications sent to customers and admins
        </p>
      </div>

      <Tabs
        defaultValue="types"
        onValueChange={(v) => {
          if (v === "logs" && logs.length === 0) fetchLogs(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="types">
            <Mail className="mr-1.5 h-4 w-4" />
            Email Types
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="mr-1.5 h-4 w-4" />
            Email Log
          </TabsTrigger>
        </TabsList>

        {/* ── EMAIL TYPES TAB ── */}
        <TabsContent value="types">
          <Card>
            <CardHeader>
              <CardTitle>Transactional Emails</CardTitle>
              <CardDescription>
                Toggle emails on or off and set who receives them
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Email</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[160px]">Recipient</TableHead>
                      <TableHead className="w-[80px] text-center">
                        Status
                      </TableHead>
                      <TableHead className="w-[120px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailTypes.map((et) => (
                      <TableRow key={et.type}>
                        <TableCell className="font-medium">
                          {et.label}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {et.description}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={et.recipient}
                            onValueChange={(val) =>
                              handleRecipientChange(et.type, val)
                            }
                            disabled={updating === et.type}
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={et.enabled}
                            onCheckedChange={(checked) =>
                              handleToggle(et.type, checked)
                            }
                            disabled={updating === et.type}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setTestDialog({
                                open: true,
                                type: et.type,
                                label: et.label,
                              })
                            }
                          >
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                            Test
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EMAIL LOG TAB ── */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Log</CardTitle>
                  <CardDescription>
                    {logsTotal} total email{logsTotal !== 1 ? "s" : ""} sent
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(logsPage)}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <Mail className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p>No emails sent yet</p>
                  <p className="text-sm">
                    Emails will appear here once they are sent
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Date</TableHead>
                        <TableHead className="w-[140px]">Type</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="w-[90px] text-center">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {formatEmailType(log.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.to}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[300px] truncate text-sm">
                            {log.subject}
                          </TableCell>
                          <TableCell className="text-center">
                            {log.status === "sent" ? (
                              <Badge className="bg-green-600/20 text-green-400 hover:bg-green-600/20">
                                Sent
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                title={log.error || ""}
                              >
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {logsTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Page {logsPage} of {logsTotalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={logsPage <= 1}
                          onClick={() => fetchLogs(logsPage - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={logsPage >= logsTotalPages}
                          onClick={() => fetchLogs(logsPage + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── TEST EMAIL DIALOG ── */}
      <Dialog
        open={testDialog.open}
        onOpenChange={(open) => {
          if (!open) setTestDialog({ open: false, type: "", label: "" });
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test &quot;{testDialog.label}&quot; email with sample data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="Enter email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTestSend();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTestDialog({ open: false, type: "", label: "" })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={!testEmail || testSending}
            >
              {testSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

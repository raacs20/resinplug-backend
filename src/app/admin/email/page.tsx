"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Save,
  Eye,
  RotateCcw,
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

/* ── Field definitions per email type ── */

interface FieldDef {
  key: string;
  label: string;
  type: "input" | "textarea";
  placeholder?: string;
}

const FIELD_DEFS: Record<string, FieldDef[]> = {
  order_placed: [
    { key: "heading", label: "Heading", type: "input" },
    { key: "body", label: "Body Text", type: "textarea", placeholder: "Supports {firstName}, {orderNumber}" },
    { key: "buttonText", label: "Button Text", type: "input" },
  ],
  order_shipped: [
    { key: "heading", label: "Heading", type: "input" },
    { key: "body", label: "Body Text", type: "textarea", placeholder: "Supports {firstName}, {orderNumber}" },
    { key: "body2", label: "Body Text 2", type: "textarea", placeholder: "Second paragraph" },
    { key: "buttonText", label: "Button Text", type: "input" },
  ],
  order_delivered: [
    { key: "heading", label: "Heading", type: "input" },
    { key: "body", label: "Body Text", type: "textarea", placeholder: "Supports {firstName}, {orderNumber}" },
    { key: "body2", label: "Body Text 2", type: "textarea", placeholder: "Second paragraph" },
    { key: "buttonText", label: "Button Text", type: "input" },
  ],
  order_cancelled: [
    { key: "heading", label: "Heading", type: "input" },
    { key: "body", label: "Body Text", type: "textarea", placeholder: "Supports {firstName}, {orderNumber}" },
    { key: "body2", label: "Body Text 2", type: "textarea", placeholder: "Second paragraph" },
    { key: "buttonText", label: "Button Text", type: "input" },
  ],
  tracking_update: [
    { key: "heading", label: "Heading", type: "input" },
    { key: "body", label: "Body Text", type: "textarea", placeholder: "Supports {firstName}, {orderNumber}, {trackingNumber}" },
    { key: "buttonText", label: "Button Text", type: "input" },
  ],
  welcome: [
    { key: "heading", label: "Heading", type: "input" },
    { key: "body", label: "Body Text", type: "textarea", placeholder: "Supports {firstName}" },
    { key: "buttonText", label: "Button Text", type: "input" },
  ],
};

const PLACEHOLDERS: Record<string, string[]> = {
  order_placed: ["{firstName}", "{orderNumber}"],
  order_shipped: ["{firstName}", "{orderNumber}"],
  order_delivered: ["{firstName}", "{orderNumber}"],
  order_cancelled: ["{firstName}", "{orderNumber}"],
  tracking_update: ["{firstName}", "{orderNumber}", "{trackingNumber}"],
  welcome: ["{firstName}"],
};

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

  // Edit view state
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [defaultFields, setDefaultFields] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  /* ── Edit view: enter ── */

  async function enterEditView(type: string, label: string) {
    setEditingType(type);
    setEditingLabel(label);
    setEditLoading(true);
    setPreviewHtml("");

    try {
      // Fetch current content (saved overrides + defaults)
      const contentRes = await fetch(
        `${API}/api/admin/email/content?type=${type}`,
        { credentials: "include" }
      );
      const contentJson = await contentRes.json();
      if (contentJson.data) {
        setEditFields(contentJson.data.content || {});
        setDefaultFields(contentJson.data.defaults || {});
      }

      // Fetch preview HTML
      await fetchPreview(type);
    } catch {
      toast.error("Failed to load email content");
    } finally {
      setEditLoading(false);
    }
  }

  /* ── Edit view: fetch preview ── */

  async function fetchPreview(type: string, overrides?: Record<string, string>) {
    setPreviewLoading(true);
    try {
      const body: Record<string, unknown> = { type };
      if (overrides) body.overrides = overrides;

      const res = await fetch(`${API}/api/admin/email/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.data?.html) {
        setPreviewHtml(json.data.html);
      }
    } catch {
      toast.error("Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  /* ── Edit view: save ── */

  async function handleSave() {
    if (!editingType) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/email/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: editingType, fields: editFields }),
      });
      if (res.ok) {
        toast.success("Email content saved");
        // Refresh preview with saved content
        await fetchPreview(editingType);
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  /* ── Edit view: reset to defaults ── */

  function handleResetToDefaults() {
    if (!editingType) return;
    setEditFields({ ...defaultFields });
    toast.info("Fields reset to defaults (save to apply)");
  }

  /* ── Edit view: refresh preview ── */

  async function handleRefreshPreview() {
    if (!editingType) return;
    await fetchPreview(editingType, editFields);
  }

  /* ── Edit view: update field ── */

  function updateField(key: string, value: string) {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Write HTML to iframe ── */

  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  /* ── Render: Edit View ── */

  if (editingType) {
    const fields = FIELD_DEFS[editingType] || [];
    const placeholders = PLACEHOLDERS[editingType] || [];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingType(null)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {editingLabel}
              </h1>
              <p className="text-muted-foreground text-sm">
                Edit content and preview how it looks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTestDialog({
                  open: true,
                  type: editingType,
                  label: editingLabel,
                })
              }
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send Test
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {editLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4 pt-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-[500px] w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Edit Fields */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Edit Content</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToDefaults}
                    className="text-muted-foreground h-8 text-xs"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset to Defaults
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`field-${field.key}`} className="text-sm">
                      {field.label}
                    </Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={`field-${field.key}`}
                        value={editFields[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder || defaultFields[field.key]}
                        rows={3}
                        className="resize-none text-sm"
                      />
                    ) : (
                      <Input
                        id={`field-${field.key}`}
                        value={editFields[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={defaultFields[field.key]}
                        className="text-sm"
                      />
                    )}
                  </div>
                ))}

                {/* Placeholder help */}
                {placeholders.length > 0 && (
                  <div className="rounded-md border border-dashed p-3">
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                      Available placeholders
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {placeholders.map((p) => (
                        <code
                          key={p}
                          className="bg-muted rounded px-1.5 py-0.5 text-xs"
                        >
                          {p}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Preview */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <Eye className="mr-1.5 inline-block h-4 w-4" />
                    Preview
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPreview}
                    disabled={previewLoading}
                    className="h-8"
                  >
                    {previewLoading ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1 h-3 w-3" />
                    )}
                    Refresh Preview
                  </Button>
                </div>
                <CardDescription>
                  Click &quot;Refresh Preview&quot; to see your changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {previewLoading && !previewHtml ? (
                  <Skeleton className="h-[500px] w-full rounded-lg" />
                ) : (
                  <div className="relative overflow-hidden rounded-lg border bg-white">
                    <iframe
                      ref={iframeRef}
                      title="Email Preview"
                      className="h-[540px] w-full border-0"
                      sandbox="allow-same-origin"
                    />
                    {previewLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Email Dialog (also available from edit view) */}
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
                <Label htmlFor="test-email-edit">Email Address</Label>
                <Input
                  id="test-email-edit"
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

  /* ── Render: List View ── */

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
                Click an email to edit content and preview. Toggle on/off and set
                recipients.
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
                      <TableRow
                        key={et.type}
                        className="cursor-pointer"
                        onClick={() => enterEditView(et.type, et.label)}
                      >
                        <TableCell className="font-medium">
                          {et.label}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {et.description}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                        <TableCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Switch
                            checked={et.enabled}
                            onCheckedChange={(checked) =>
                              handleToggle(et.type, checked)
                            }
                            disabled={updating === et.type}
                          />
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
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

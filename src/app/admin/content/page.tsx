"use client";

import { useEffect, useState, useCallback } from "react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Image,
  Type,
  Layout,
  Megaphone,
  Zap,
  Heart,
  Mail,
  Globe,
  Headphones,
  Save,
  Loader2,
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  X,
  Check,
} from "lucide-react";

/* ── Section definitions ── */

interface ContentField {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "toggle";
  placeholder?: string;
  helperText?: string;
}

interface SectionDef {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  fields: ContentField[];
}

const SECTIONS: SectionDef[] = [
  {
    id: "hero",
    label: "Hero",
    icon: Layout,
    description: "Main hero banner on the homepage",
    fields: [
      {
        key: "hero.headline",
        label: "Headline",
        type: "text",
        placeholder: "THE ABSOLUTE CHEAPEST RESIN IN USA",
        helperText: "Main heading displayed in the hero section",
      },
      {
        key: "hero.subtext",
        label: "Subtext",
        type: "textarea",
        placeholder: "Premium quality resin at unbeatable prices...",
        helperText: "Supporting text below the headline",
      },
      {
        key: "hero.ctaText",
        label: "CTA Button Text",
        type: "text",
        placeholder: "SHOP NOW",
        helperText: "Text displayed on the call-to-action button",
      },
      {
        key: "hero.ctaLink",
        label: "CTA Button Link",
        type: "text",
        placeholder: "/shop",
        helperText: "URL the CTA button links to",
      },
      {
        key: "hero.backgroundImage",
        label: "Background Image",
        type: "image",
        placeholder: "https://example.com/hero-bg.jpg",
        helperText: "Background image URL for the hero section",
      },
    ],
  },
  {
    id: "announcement",
    label: "Announcement",
    icon: Megaphone,
    description: "Orange announcement bar at the top of the site",
    fields: [
      {
        key: "announcement.text",
        label: "Announcement Text",
        type: "text",
        placeholder:
          "THE ABSOLUTE CHEAPEST RESIN IN USA! \u2022 FREE DELIVERY FROM $200",
        helperText: "Text displayed in the announcement bar",
      },
      {
        key: "announcement.link",
        label: "Link URL",
        type: "text",
        placeholder: "/shop",
        helperText: "Optional URL the announcement links to (leave empty for no link)",
      },
      {
        key: "announcement.enabled",
        label: "Enabled",
        type: "toggle",
        helperText: "Show or hide the announcement bar",
      },
    ],
  },
  {
    id: "strain-banner",
    label: "Strain Banner",
    icon: Zap,
    description: "Scrolling strain logo banner",
    fields: [
      {
        key: "strain-banner.enabled",
        label: "Enabled",
        type: "toggle",
        helperText: "Show or hide the scrolling strain banner",
      },
      {
        key: "strain-banner.speed",
        label: "Scroll Speed",
        type: "text",
        placeholder: "30",
        helperText: "Animation duration in seconds (lower = faster)",
      },
    ],
  },
  {
    id: "why-resinplug",
    label: "Why ResinPlug",
    icon: Heart,
    description: "Feature cards highlighting your value propositions",
    fields: [
      {
        key: "why-resinplug.heading",
        label: "Section Heading",
        type: "text",
        placeholder: "WHY RESINPLUG?",
        helperText: "Heading displayed above the feature cards",
      },
      {
        key: "why-resinplug.card1.title",
        label: "Card 1 Title",
        type: "text",
        placeholder: "Premium Quality",
      },
      {
        key: "why-resinplug.card1.description",
        label: "Card 1 Description",
        type: "textarea",
        placeholder: "We source only the finest resin...",
      },
      {
        key: "why-resinplug.card1.icon",
        label: "Card 1 Icon",
        type: "text",
        placeholder: "shield",
        helperText: "Lucide icon name (e.g., shield, star, zap)",
      },
      {
        key: "why-resinplug.card2.title",
        label: "Card 2 Title",
        type: "text",
        placeholder: "Fast Shipping",
      },
      {
        key: "why-resinplug.card2.description",
        label: "Card 2 Description",
        type: "textarea",
        placeholder: "Free shipping on orders over $200...",
      },
      {
        key: "why-resinplug.card2.icon",
        label: "Card 2 Icon",
        type: "text",
        placeholder: "truck",
        helperText: "Lucide icon name (e.g., shield, star, zap)",
      },
      {
        key: "why-resinplug.card3.title",
        label: "Card 3 Title",
        type: "text",
        placeholder: "Best Prices",
      },
      {
        key: "why-resinplug.card3.description",
        label: "Card 3 Description",
        type: "textarea",
        placeholder: "The absolute cheapest resin in the USA...",
      },
      {
        key: "why-resinplug.card3.icon",
        label: "Card 3 Icon",
        type: "text",
        placeholder: "dollar-sign",
        helperText: "Lucide icon name (e.g., shield, star, zap)",
      },
    ],
  },
  {
    id: "latest-drop",
    label: "Latest Drop",
    icon: FileText,
    description: "Latest product drop section on the homepage",
    fields: [
      {
        key: "latest-drop.heading",
        label: "Section Heading",
        type: "text",
        placeholder: "LATEST DROP",
        helperText: "Heading for the latest drop section",
      },
      {
        key: "latest-drop.subheading",
        label: "Section Subheading",
        type: "text",
        placeholder: "Check out our newest arrivals",
        helperText: "Subheading displayed below the section heading",
      },
      {
        key: "latest-drop.bannerImage",
        label: "Promotional Banner Image",
        type: "image",
        placeholder: "https://example.com/latest-drop-banner.jpg",
        helperText: "Banner image for the latest drop promotion",
      },
    ],
  },
  {
    id: "newsletter",
    label: "Newsletter",
    icon: Mail,
    description: "Email signup call-to-action section",
    fields: [
      {
        key: "newsletter.heading",
        label: "Heading",
        type: "text",
        placeholder: "STAY IN THE LOOP",
        helperText: "Main heading for the newsletter section",
      },
      {
        key: "newsletter.subheading",
        label: "Subheading",
        type: "text",
        placeholder: "Get exclusive deals and new product updates",
        helperText: "Supporting text below the heading",
      },
      {
        key: "newsletter.ctaText",
        label: "CTA Button Text",
        type: "text",
        placeholder: "SUBSCRIBE",
        helperText: "Text on the subscribe button",
      },
    ],
  },
  {
    id: "footer",
    label: "Footer",
    icon: Globe,
    description: "Site footer with links and social media",
    fields: [
      {
        key: "footer.about",
        label: "About Text",
        type: "textarea",
        placeholder: "ResinPlug is the #1 source for premium resin...",
        helperText: "About text displayed in the footer",
      },
      {
        key: "footer.instagram",
        label: "Instagram URL",
        type: "text",
        placeholder: "https://instagram.com/resinplug",
        helperText: "Instagram profile link",
      },
      {
        key: "footer.twitter",
        label: "Twitter URL",
        type: "text",
        placeholder: "https://twitter.com/resinplug",
        helperText: "Twitter/X profile link",
      },
      {
        key: "footer.tiktok",
        label: "TikTok URL",
        type: "text",
        placeholder: "https://tiktok.com/@resinplug",
        helperText: "TikTok profile link",
      },
      {
        key: "footer.copyright",
        label: "Copyright Text",
        type: "text",
        placeholder: "\u00a9 2026 ResinPlug. All rights reserved.",
        helperText: "Copyright text in the footer",
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: Headphones,
    description: "Support page content and contact details",
    fields: [
      {
        key: "support.heading",
        label: "Page Heading",
        type: "text",
        placeholder: "How can we help?",
        helperText: "Main heading on the support page",
      },
      {
        key: "support.email",
        label: "Support Email",
        type: "text",
        placeholder: "support@resinplug.com",
        helperText: "Customer support email address",
      },
      {
        key: "support.phone",
        label: "Support Phone",
        type: "text",
        placeholder: "+1 (555) 123-4567",
        helperText: "Customer support phone number",
      },
    ],
  },
];

/* -- FAQ Types -- */

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Component ── */

export default function AdminContent() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>(
    {}
  );

  // FAQ state
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [newFaqSortOrder, setNewFaqSortOrder] = useState("");
  const [addingFaq, setAddingFaq] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editFaqQuestion, setEditFaqQuestion] = useState("");
  const [editFaqAnswer, setEditFaqAnswer] = useState("");
  const [editFaqSortOrder, setEditFaqSortOrder] = useState("");
  const [savingFaqEdit, setSavingFaqEdit] = useState(false);
  const [deleteFaqConfirm, setDeleteFaqConfirm] = useState<FAQItem | null>(null);
  const [activeTab, setActiveTab] = useState("hero");

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/content", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        const map: Record<string, string> = {};
        for (const block of data.data) {
          map[block.key] = block.value;
        }
        setValues(map);
      }
    } catch (err) {
      console.error("Failed to fetch content:", err);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFaqs = useCallback(async () => {
    setFaqLoading(true);
    try {
      const res = await fetch("/api/admin/faq", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setFaqs(data.data || []);
    } catch (err) {
      console.error("Failed to fetch FAQs:", err);
      toast.error("Failed to load FAQs");
    } finally {
      setFaqLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
    fetchFaqs();
  }, [fetchContent, fetchFaqs]);

  useKeyboardShortcut([
    {
      key: "s",
      modifiers: ["ctrl"],
      handler: () => {
        const section = SECTIONS.find((s) => s.id === activeTab);
        if (section) saveSection(section);
      },
    },
  ]);

  const updateValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleValue = (key: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));
  };

  const saveSection = async (section: SectionDef) => {
    setSavingSections((prev) => ({ ...prev, [section.id]: true }));
    try {
      const blocks = section.fields.map((field, index) => ({
        key: field.key,
        type: field.type === "image" ? "image" : "text",
        value: values[field.key] || "",
        section: section.id,
        label: field.label,
        sortOrder: index,
      }));

      const res = await fetch("/api/admin/content", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blocks),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(`${section.label} content saved successfully`);
    } catch (err) {
      console.error("Save error:", err);
      toast.error(`Failed to save ${section.label} content`);
    } finally {
      setSavingSections((prev) => ({ ...prev, [section.id]: false }));
    }
  };

  // FAQ handlers
  const handleAddFaq = async () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setAddingFaq(true);
    try {
      const res = await fetch("/api/admin/faq", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newFaqQuestion,
          answer: newFaqAnswer,
          sortOrder: newFaqSortOrder ? Number(newFaqSortOrder) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("FAQ created successfully");
      setNewFaqQuestion("");
      setNewFaqAnswer("");
      setNewFaqSortOrder("");
      setShowAddFaq(false);
      fetchFaqs();
    } catch {
      toast.error("Failed to create FAQ");
    } finally {
      setAddingFaq(false);
    }
  };

  const startEditFaq = (faq: FAQItem) => {
    setEditingFaqId(faq.id);
    setEditFaqQuestion(faq.question);
    setEditFaqAnswer(faq.answer);
    setEditFaqSortOrder(String(faq.sortOrder));
  };

  const cancelEditFaq = () => {
    setEditingFaqId(null);
    setEditFaqQuestion("");
    setEditFaqAnswer("");
    setEditFaqSortOrder("");
  };

  const handleSaveEditFaq = async () => {
    if (!editingFaqId || !editFaqQuestion.trim() || !editFaqAnswer.trim()) return;
    setSavingFaqEdit(true);
    try {
      const res = await fetch("/api/admin/faq", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingFaqId,
          question: editFaqQuestion,
          answer: editFaqAnswer,
          sortOrder: Number(editFaqSortOrder),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("FAQ updated successfully");
      cancelEditFaq();
      fetchFaqs();
    } catch {
      toast.error("Failed to update FAQ");
    } finally {
      setSavingFaqEdit(false);
    }
  };

  const handleToggleFaqActive = async (faq: FAQItem) => {
    try {
      const res = await fetch("/api/admin/faq", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: faq.id, isActive: !faq.isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("FAQ " + (faq.isActive ? "deactivated" : "activated"));
      fetchFaqs();
    } catch {
      toast.error("Failed to toggle FAQ status");
    }
  };

  const handleDeleteFaq = async () => {
    if (!deleteFaqConfirm) return;
    try {
      const res = await fetch("/api/admin/faq", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteFaqConfirm.id }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("FAQ deleted successfully");
      setDeleteFaqConfirm(null);
      fetchFaqs();
    } catch {
      toast.error("Failed to delete FAQ");
    }
  };

    if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Manager</h1>
        <p className="text-muted-foreground text-sm">
          Edit all frontend text, images, and banners without code changes
        </p>
      </div>

      <Tabs defaultValue="hero" onValueChange={setActiveTab}>
        <TabsList className="flex w-full h-auto gap-1 overflow-x-auto overflow-y-hidden pb-1">
          {SECTIONS.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              <section.icon className="mr-1.5 h-4 w-4" />
              {section.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="faq">
            <HelpCircle className="mr-1.5 h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        {SECTIONS.map((section) => (
          <TabsContent key={section.id} value={section.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <section.icon className="h-5 w-5" />
                      {section.label}
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                  <Button
                    onClick={() => saveSection(section)}
                    disabled={savingSections[section.id]}
                  >
                    {savingSections[section.id] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {savingSections[section.id]
                      ? "Saving..."
                      : `Save ${section.label}`}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {section.fields.map((field) => (
                  <ContentFieldEditor
                    key={field.key}
                    field={field}
                    value={values[field.key] || ""}
                    onChange={(val) => updateValue(field.key, val)}
                    onToggle={() => toggleValue(field.key)}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* ── FAQ Tab Content ── */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    FAQ
                  </CardTitle>
                  <CardDescription>
                    Manage frequently asked questions displayed on the frontend
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddFaq(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new FAQ form */}
              {showAddFaq && (
                <Card className="border-dashed">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Input
                        value={newFaqQuestion}
                        onChange={(e) => setNewFaqQuestion(e.target.value)}
                        placeholder="Enter the question..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Answer</Label>
                      <Textarea
                        value={newFaqAnswer}
                        onChange={(e) => setNewFaqAnswer(e.target.value)}
                        placeholder="Enter the answer..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={newFaqSortOrder}
                        onChange={(e) => setNewFaqSortOrder(e.target.value)}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddFaq} disabled={addingFaq}>
                        {addingFaq ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        {addingFaq ? "Adding..." : "Add FAQ"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddFaq(false);
                          setNewFaqQuestion("");
                          setNewFaqAnswer("");
                          setNewFaqSortOrder("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* FAQ list */}
              {faqLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : faqs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No FAQs yet. Click &quot;Add FAQ&quot; to create one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {faqs
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((faq) => (
                      <Card key={faq.id} className={!faq.isActive ? "opacity-50" : ""}>
                        <CardContent className="pt-4 pb-4">
                          {editingFaqId === faq.id ? (
                            /* ── Editing mode ── */
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label>Question</Label>
                                <Input
                                  value={editFaqQuestion}
                                  onChange={(e) => setEditFaqQuestion(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Answer</Label>
                                <Textarea
                                  value={editFaqAnswer}
                                  onChange={(e) => setEditFaqAnswer(e.target.value)}
                                  rows={3}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Sort Order</Label>
                                <Input
                                  type="number"
                                  value={editFaqSortOrder}
                                  onChange={(e) => setEditFaqSortOrder(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveEditFaq} disabled={savingFaqEdit}>
                                  {savingFaqEdit ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="mr-2 h-3 w-3" />
                                  )}
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditFaq}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* ── Display mode ── */
                            <div className="flex items-start gap-3">
                              <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5 cursor-grab" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm">{faq.question}</p>
                                  {!faq.isActive && (
                                    <Badge variant="secondary" className="text-xs">Hidden</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Switch
                                  checked={faq.isActive}
                                  onCheckedChange={() => handleToggleFaqActive(faq)}
                                />
                                <Button size="icon" variant="ghost" onClick={() => startEditFaq(faq)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteFaqConfirm(faq)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Delete FAQ Confirmation Dialog ── */}
      <AlertDialog open={!!deleteFaqConfirm} onOpenChange={() => setDeleteFaqConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteFaqConfirm?.question}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFaq} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Field Editor Component ── */

function ContentFieldEditor({
  field,
  value,
  onChange,
  onToggle,
}: {
  field: ContentField;
  value: string;
  onChange: (val: string) => void;
  onToggle: () => void;
}) {
  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>{field.label}</Label>
          {field.helperText && (
            <p className="text-sm text-muted-foreground">{field.helperText}</p>
          )}
        </div>
        <Switch checked={value === "true"} onCheckedChange={onToggle} />
      </div>
    );
  }

  if (field.type === "image") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={field.key} className="flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5 text-muted-foreground" />
            {field.label}
          </Label>
          <Input
            id={field.key}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {field.helperText && (
            <p className="text-xs text-muted-foreground">{field.helperText}</p>
          )}
        </div>
        {value && (
          <div className="rounded-lg border border-dashed p-2">
            <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value || "/placeholder-product.svg"}
                alt={field.label}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-product.svg";
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground truncate max-w-xs">
              {value}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.key} className="flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5 text-muted-foreground" />
          {field.label}
        </Label>
        <Textarea
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
        {field.helperText && (
          <p className="text-xs text-muted-foreground">{field.helperText}</p>
        )}
      </div>
    );
  }

  // Default: text input
  return (
    <div className="space-y-2">
      <Label htmlFor={field.key}>{field.label}</Label>
      <Input
        id={field.key}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
      {field.helperText && (
        <p className="text-xs text-muted-foreground">{field.helperText}</p>
      )}
    </div>
  );
}

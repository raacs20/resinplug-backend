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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Save,
  Loader2,
  Globe,
} from "lucide-react";

interface PageSeo {
  page: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

const PAGES = [
  { key: "home", label: "Home", path: "/" },
  { key: "shop", label: "Shop", path: "/shop" },
  { key: "reviews", label: "Reviews", path: "/reviews" },
  { key: "support", label: "Support", path: "/support" },
  { key: "tracking", label: "Tracking", path: "/tracking" },
  { key: "checkout", label: "Checkout", path: "/checkout" },
] as const;

export default function AdminSeo() {
  const [pageSeoData, setPageSeoData] = useState<PageSeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPage, setSavingPage] = useState<string | null>(null);

  const fetchSeoData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/seo", { credentials: "include" })
      .then((r) => {
        if (r.status === 404) {
          // API not configured yet, initialize with empty data
          const emptyData = PAGES.map((p) => ({
            page: p.key,
            metaTitle: "",
            metaDescription: "",
            metaKeywords: "",
          }));
          setPageSeoData(emptyData);
          setError(
            "SEO API not configured yet. Changes will be saved once the API is set up."
          );
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          // Merge API data with known pages to ensure all pages are shown
          const apiData: PageSeo[] = data.data || [];
          const merged = PAGES.map((p) => {
            const existing = apiData.find((d) => d.page === p.key);
            return (
              existing || {
                page: p.key,
                metaTitle: "",
                metaDescription: "",
                metaKeywords: "",
              }
            );
          });
          setPageSeoData(merged);
        }
      })
      .catch(() => {
        toast.error("Failed to load SEO data");
        const emptyData = PAGES.map((p) => ({
          page: p.key,
          metaTitle: "",
          metaDescription: "",
          metaKeywords: "",
        }));
        setPageSeoData(emptyData);
        setError(
          "SEO API not configured yet. Changes will be saved once the API is set up."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSeoData();
  }, [fetchSeoData]);

  useKeyboardShortcut([
    {
      key: "s",
      modifiers: ["ctrl"],
      handler: () => {
        // Save all pages
        for (const seo of pageSeoData) {
          handleSavePage(seo.page);
        }
      },
    },
  ]);

  const updatePageSeo = (
    pageKey: string,
    field: keyof PageSeo,
    value: string
  ) => {
    setPageSeoData((prev) =>
      prev.map((p) => (p.page === pageKey ? { ...p, [field]: value } : p))
    );
  };

  const handleSavePage = async (pageKey: string) => {
    const pageData = pageSeoData.find((p) => p.page === pageKey);
    if (!pageData) return;

    setSavingPage(pageKey);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pageData),
      });
      if (res.status === 404) {
        toast.error("SEO API not configured yet");
        return;
      }
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`SEO settings saved for ${pageKey}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save SEO settings. API may not be configured yet.");
    } finally {
      setSavingPage(null);
    }
  };

  const getPageConfig = (key: string) => PAGES.find((p) => p.key === key);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Page SEO</h1>
        <p className="text-muted-foreground text-sm">
          Manage meta tags for each frontend page
        </p>
      </div>

      {error && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-500">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {pageSeoData.map((seo) => {
          const config = getPageConfig(seo.page);
          if (!config) return null;

          return (
            <Card key={seo.page}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {config.label}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {config.path}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSavePage(seo.page)}
                    disabled={savingPage === seo.page}
                  >
                    {savingPage === seo.page ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3 w-3" />
                    )}
                    {savingPage === seo.page ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${seo.page}-title`}>Meta Title</Label>
                  <Input
                    id={`${seo.page}-title`}
                    value={seo.metaTitle}
                    onChange={(e) =>
                      updatePageSeo(seo.page, "metaTitle", e.target.value)
                    }
                    placeholder={`${config.label} | ResinPlug`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {seo.metaTitle.length}/60 characters recommended
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${seo.page}-desc`}>Meta Description</Label>
                  <Textarea
                    id={`${seo.page}-desc`}
                    value={seo.metaDescription}
                    onChange={(e) =>
                      updatePageSeo(
                        seo.page,
                        "metaDescription",
                        e.target.value
                      )
                    }
                    placeholder={`Description for the ${config.label.toLowerCase()} page...`}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    {seo.metaDescription.length}/160 characters recommended
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${seo.page}-keywords`}>
                    Meta Keywords
                  </Label>
                  <Input
                    id={`${seo.page}-keywords`}
                    value={seo.metaKeywords}
                    onChange={(e) =>
                      updatePageSeo(seo.page, "metaKeywords", e.target.value)
                    }
                    placeholder="resin, products, shop"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

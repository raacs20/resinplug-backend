"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store,
  Truck,
  Search,
  Coins,
  Save,
  Loader2,
  Palette,
  Upload,
  RotateCcw,
  ImageIcon,
} from "lucide-react";

interface Settings {
  // General
  storeName: string;
  siteDescription: string;
  announcementBar: string;
  announcementBarEnabled: string;
  featuredCollection: string;
  // Shipping
  freeShippingThreshold: string;
  flatRate: string;
  // SEO
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
  // Credits
  creditsEnabled: string;
  creditsPerDollar: string;
  creditValue: string;
  signupBonusCredits: string;
  // Branding
  brandLogo: string;
  brandFavicon: string;
  brandTagline: string;
  colorPrimary: string;
  colorPrimaryHover: string;
  colorBackground: string;
  colorCardDark: string;
  colorBorder: string;
  colorMutedText: string;
}

const DEFAULT_COLORS = {
  colorPrimary: "#EC691B",
  colorPrimaryHover: "#D45D16",
  colorBackground: "#050100",
  colorCardDark: "#0F0F0F",
  colorBorder: "#444444",
  colorMutedText: "#D1D1D1",
};

const DEFAULT_SETTINGS: Settings = {
  storeName: "",
  siteDescription: "",
  announcementBar: "",
  announcementBarEnabled: "false",
  featuredCollection: "",
  freeShippingThreshold: "",
  flatRate: "",
  defaultMetaTitle: "",
  defaultMetaDescription: "",
  googleAnalyticsId: "",
  facebookPixelId: "",
  creditsEnabled: "false",
  creditsPerDollar: "",
  creditValue: "",
  signupBonusCredits: "",
  brandLogo: "",
  brandFavicon: "",
  brandTagline: "",
  ...DEFAULT_COLORS,
};

const COLOR_FIELDS: {
  key: keyof Settings;
  label: string;
  desc: string;
}[] = [
  { key: "colorPrimary", label: "Primary Accent", desc: "Buttons, links, and CTAs" },
  { key: "colorPrimaryHover", label: "Primary Hover", desc: "Button hover states" },
  { key: "colorBackground", label: "Background", desc: "Page background" },
  { key: "colorCardDark", label: "Card / Dark", desc: "Card backgrounds" },
  { key: "colorBorder", label: "Border", desc: "Borders and dividers" },
  { key: "colorMutedText", label: "Muted Text", desc: "Secondary text color" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        if (data.data) {
          setSettings((prev) => ({ ...prev, ...data.data }));
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleField = (key: keyof Settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved successfully");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);

  const handleBrandingUpload = async (
    file: File,
    type: "logo" | "favicon"
  ) => {
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/admin/settings/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const key = type === "logo" ? "brandLogo" : "brandFavicon";
      setSettings((prev) => ({ ...prev, [key]: json.data.url }));
      toast.success(`${type === "logo" ? "Logo" : "Favicon"} uploaded`);
    } catch {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(null);
    }
  };

  const resetColors = () => {
    setSettings((prev) => ({ ...prev, ...DEFAULT_COLORS }));
    toast.success("Colors reset to defaults");
  };

  useKeyboardShortcut([
    {
      key: "s",
      modifiers: ["ctrl"],
      handler: () => {
        handleSave();
      },
    },
  ]);

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your store configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Store className="mr-1.5 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="shipping">
            <Truck className="mr-1.5 h-4 w-4" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Search className="mr-1.5 h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="credits">
            <Coins className="mr-1.5 h-4 w-4" />
            Credits
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="mr-1.5 h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic store information and display options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  value={settings.storeName}
                  onChange={(e) => updateField("storeName", e.target.value)}
                  placeholder="ResinPlug"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) =>
                    updateField("siteDescription", e.target.value)
                  }
                  placeholder="The Absolute Cheapest Resin in the USA"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="announcementBar">Announcement Bar Text</Label>
                <Input
                  id="announcementBar"
                  value={settings.announcementBar}
                  onChange={(e) =>
                    updateField("announcementBar", e.target.value)
                  }
                  placeholder="THE ABSOLUTE CHEAPEST RESIN IN USA! &bull; FREE DELIVERY FROM $XX"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Announcement Bar Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Show the announcement bar at the top of the site
                  </p>
                </div>
                <Switch
                  checked={settings.announcementBarEnabled === "true"}
                  onCheckedChange={() => toggleField("announcementBarEnabled")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="featuredCollection">Featured Collection</Label>
                <Input
                  id="featuredCollection"
                  value={settings.featuredCollection}
                  onChange={(e) =>
                    updateField("featuredCollection", e.target.value)
                  }
                  placeholder="Bestsellers"
                />
                <p className="text-xs text-muted-foreground">
                  The collection displayed prominently on the homepage
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Tab */}
        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Settings</CardTitle>
              <CardDescription>
                Configure shipping rates and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="freeShippingThreshold">
                  Free Shipping Threshold ($)
                </Label>
                <Input
                  id="freeShippingThreshold"
                  type="number"
                  value={settings.freeShippingThreshold}
                  onChange={(e) =>
                    updateField("freeShippingThreshold", e.target.value)
                  }
                  placeholder="200"
                />
                <p className="text-xs text-muted-foreground">
                  Orders above this amount qualify for free shipping
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="flatRate">Flat Rate Shipping ($)</Label>
                <Input
                  id="flatRate"
                  type="number"
                  value={settings.flatRate}
                  onChange={(e) => updateField("flatRate", e.target.value)}
                  placeholder="9.99"
                />
                <p className="text-xs text-muted-foreground">
                  Standard shipping cost for orders below the free shipping
                  threshold
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Default meta tags and tracking IDs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defaultMetaTitle">Default Meta Title</Label>
                <Input
                  id="defaultMetaTitle"
                  value={settings.defaultMetaTitle}
                  onChange={(e) =>
                    updateField("defaultMetaTitle", e.target.value)
                  }
                  placeholder="ResinPlug - The Absolute Cheapest Resin in the USA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultMetaDescription">
                  Default Meta Description
                </Label>
                <Textarea
                  id="defaultMetaDescription"
                  value={settings.defaultMetaDescription}
                  onChange={(e) =>
                    updateField("defaultMetaDescription", e.target.value)
                  }
                  placeholder="Shop premium resin products at unbeatable prices..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                <Input
                  id="googleAnalyticsId"
                  value={settings.googleAnalyticsId}
                  onChange={(e) =>
                    updateField("googleAnalyticsId", e.target.value)
                  }
                  placeholder="G-XXXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookPixelId">Facebook Pixel ID</Label>
                <Input
                  id="facebookPixelId"
                  value={settings.facebookPixelId}
                  onChange={(e) =>
                    updateField("facebookPixelId", e.target.value)
                  }
                  placeholder="1234567890"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits">
          <Card>
            <CardHeader>
              <CardTitle>Credit System</CardTitle>
              <CardDescription>
                Configure store credit and rewards program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Credits Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to earn and spend store credits
                  </p>
                </div>
                <Switch
                  checked={settings.creditsEnabled === "true"}
                  onCheckedChange={() => toggleField("creditsEnabled")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditsPerDollar">
                  Credits Per Dollar Spent
                </Label>
                <Input
                  id="creditsPerDollar"
                  type="number"
                  value={settings.creditsPerDollar}
                  onChange={(e) =>
                    updateField("creditsPerDollar", e.target.value)
                  }
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  Number of credits earned per dollar spent
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditValue">
                  Credit Value (credits per $1)
                </Label>
                <Input
                  id="creditValue"
                  type="number"
                  value={settings.creditValue}
                  onChange={(e) => updateField("creditValue", e.target.value)}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">
                  How many credits equal $1 in store value (e.g., 10 credits =
                  $1)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupBonusCredits">
                  Signup Bonus Credits
                </Label>
                <Input
                  id="signupBonusCredits"
                  type="number"
                  value={settings.signupBonusCredits}
                  onChange={(e) =>
                    updateField("signupBonusCredits", e.target.value)
                  }
                  placeholder="50"
                />
                <p className="text-xs text-muted-foreground">
                  Credits awarded when a new customer creates an account
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Logo, favicon, and tagline — the face of your site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-start gap-4">
                  {settings.brandLogo ? (
                    <div className="flex-shrink-0 w-[160px] h-[80px] rounded-lg border border-border bg-black flex items-center justify-center overflow-hidden">
                      <img
                        src={settings.brandLogo}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-[160px] h-[80px] rounded-lg border border-dashed border-border flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandingUpload(file, "logo");
                          e.target.value = "";
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="pointer-events-none"
                        disabled={uploading === "logo"}
                      >
                        {uploading === "logo" ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-3 w-3" />
                        )}
                        {uploading === "logo" ? "Uploading..." : "Upload Logo"}
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      PNG, SVG, or WebP. Recommended: transparent background, 400×200px
                    </p>
                  </div>
                </div>
              </div>

              {/* Favicon Upload */}
              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  {settings.brandFavicon ? (
                    <div className="flex-shrink-0 w-10 h-10 rounded border border-border bg-black flex items-center justify-center overflow-hidden">
                      <img
                        src={settings.brandFavicon}
                        alt="Favicon"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 rounded border border-dashed border-border flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBrandingUpload(file, "favicon");
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="pointer-events-none"
                      disabled={uploading === "favicon"}
                    >
                      {uploading === "favicon" ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-3 w-3" />
                      )}
                      {uploading === "favicon" ? "Uploading..." : "Upload Favicon"}
                    </Button>
                  </label>
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <Label htmlFor="brandTagline">Tagline</Label>
                <Input
                  id="brandTagline"
                  value={settings.brandTagline}
                  onChange={(e) => updateField("brandTagline", e.target.value)}
                  placeholder="The absolute cheapest resin in the USA."
                />
                <p className="text-xs text-muted-foreground">
                  Appears in the footer below your logo
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Brand Colors</CardTitle>
                  <CardDescription>
                    Pick your colors — the frontend updates instantly
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetColors}
                >
                  <RotateCcw className="mr-2 h-3 w-3" />
                  Reset to Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {COLOR_FIELDS.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings[key] || DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS]}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">{label}</Label>
                        <span className="font-mono text-xs text-muted-foreground">
                          {settings[key] || DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

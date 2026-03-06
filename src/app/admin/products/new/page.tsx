"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical, Star, Upload, Link2, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProductForm {
  name: string;
  image: string;
  category: string;
  thc: string;
  popularity: string;
  featured: boolean;
  description: string;
  shortDesc: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  sku: string;
  totalStockGrams: string;
  stockUnit: string;
}

interface VariantRow {
  tempId: string; // client-side identifier
  weight: string;
  price: string;
  originalPrice: string;
  discount: string;
  sku: string;
  gramsPerUnit: string;
  sortOrder: number;
  isDefault: boolean;
}

interface NewVariantForm {
  weight: string;
  price: string;
  originalPrice: string;
  discount: string;
  sku: string;
  gramsPerUnit: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

const emptyVariantForm: NewVariantForm = {
  weight: "",
  price: "",
  originalPrice: "",
  discount: "",
  sku: "",
  gramsPerUnit: "",
};

let variantCounter = 0;
function nextTempId(): string {
  return `tmp_${++variantCounter}`;
}

/** Returns color class based on character count vs recommended range */
function charCountColor(len: number, min: number, max: number): string {
  if (len === 0) return "text-muted-foreground";
  if (len >= min && len <= max) return "text-green-500";
  if (len > max) return "text-red-500";
  if (len >= min - 10) return "text-yellow-500";
  return "text-muted-foreground";
}

/* ------------------------------------------------------------------ */
/*  Default variants template                                          */
/* ------------------------------------------------------------------ */

function generateDefaultVariants(): VariantRow[] {
  return [
    { tempId: nextTempId(), weight: "1g",  price: "",  originalPrice: "", discount: "",    sku: "", gramsPerUnit: "1",  sortOrder: 0, isDefault: true },
    { tempId: nextTempId(), weight: "3g",  price: "",  originalPrice: "", discount: "",    sku: "", gramsPerUnit: "3",  sortOrder: 1, isDefault: false },
    { tempId: nextTempId(), weight: "15g", price: "",  originalPrice: "", discount: "10%", sku: "", gramsPerUnit: "15", sortOrder: 2, isDefault: false },
    { tempId: nextTempId(), weight: "28g", price: "",  originalPrice: "", discount: "20%", sku: "", gramsPerUnit: "28", sortOrder: 3, isDefault: false },
  ];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NewProduct() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState<ProductForm>({
    name: "",
    image: "",
    category: "Indica",
    thc: "",
    popularity: "0",
    featured: false,
    description: "",
    shortDesc: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    sku: "",
    totalStockGrams: "",
    stockUnit: "grams",
  });

  // Variants state — start with default template
  const [variants, setVariants] = useState<VariantRow[]>(generateDefaultVariants());
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [newVariant, setNewVariant] = useState<NewVariantForm>({ ...emptyVariantForm });

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slug = slugify(form.name);

  /* ---- Image upload handlers ---- */
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    let uploaded = 0;
    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "Upload failed");
        }
        const data = await res.json();
        const url = data.data?.url || data.url;

        setUploadedImages((prev) => [...prev, { url, name: file.name }]);

        // Set as product image if it's the first one
        if (uploadedImages.length === 0 && uploaded === 0) {
          updateField("image", url);
        }
        uploaded++;
        setUploadProgress(Math.round((uploaded / fileArray.length) * 100));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} image${uploaded > 1 ? "s" : ""} uploaded`);
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const removeUploadedImage = (idx: number) => {
    setUploadedImages((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      // If we removed the primary image, update form.image
      if (prev[idx]?.url === form.image) {
        updateField("image", updated[0]?.url || "");
      }
      return updated;
    });
  };

  const setPrimaryImage = (url: string) => {
    updateField("image", url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  /* ---- Field updater ---- */
  const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof key === "string" && errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  /* ---- Variant helpers ---- */
  const updateVariant = (tempId: string, field: keyof VariantRow, value: string | number | boolean) => {
    setVariants((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, [field]: value } : v))
    );
  };

  const setDefaultVariant = (tempId: string) => {
    setVariants((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.tempId === tempId }))
    );
  };

  const removeVariant = (tempId: string) => {
    setVariants((prev) => {
      const updated = prev.filter((v) => v.tempId !== tempId);
      // If we removed the default, make the first one default
      if (updated.length > 0 && !updated.some((v) => v.isDefault)) {
        updated[0].isDefault = true;
      }
      return updated;
    });
  };

  const addVariant = () => {
    if (!newVariant.weight.trim() || !newVariant.price.trim()) return;

    const row: VariantRow = {
      tempId: nextTempId(),
      weight: newVariant.weight,
      price: newVariant.price,
      originalPrice: newVariant.originalPrice,
      discount: newVariant.discount,
      sku: newVariant.sku,
      gramsPerUnit: newVariant.gramsPerUnit,
      sortOrder: variants.length,
      isDefault: variants.length === 0, // first variant is default
    };

    setVariants((prev) => [...prev, row]);
    setNewVariant({ ...emptyVariantForm });
    setVariantDialogOpen(false);
  };

  const loadDefaultVariants = () => {
    setVariants(generateDefaultVariants());
  };

  const clearAllVariants = () => {
    setVariants([]);
  };

  /* ---- Validation ---- */
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Product name is required";
    if (!slug.trim()) errs.slug = "Slug is required";
    if (!form.category) errs.category = "Category is required";
    if (!form.description.trim()) errs.description = "Description is required";

    // Validate variants
    if (variants.length === 0) {
      errs.variants = "At least one variant is required";
    } else {
      for (const v of variants) {
        if (!v.weight.trim()) {
          errs.variants = "All variants must have a weight";
          break;
        }
        if (!v.price || isNaN(Number(v.price)) || Number(v.price) <= 0) {
          errs.variants = `Variant "${v.weight}" needs a valid price`;
          break;
        }
        if (v.originalPrice && (isNaN(Number(v.originalPrice)) || Number(v.originalPrice) <= 0)) {
          errs.variants = `Variant "${v.weight}" has an invalid original price`;
          break;
        }
      }
    }

    setErrors(errs);

    // If there's a variant error, switch to that tab
    if (errs.variants && activeTab !== "variants") {
      setActiveTab("variants");
    }

    return Object.keys(errs).length === 0;
  };

  /* ---- Submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setSaving(true);

    // Find the default variant to use as the product-level price
    const defaultVariant = variants.find((v) => v.isDefault) || variants[0];

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug,
          salePrice: Number(defaultVariant.price),
          originalPrice: defaultVariant.originalPrice
            ? Number(defaultVariant.originalPrice)
            : Number(defaultVariant.price),
          image: form.image,
          category: form.category,
          thc: form.thc,
          popularity: Number(form.popularity),
          featured: form.featured,
          description: form.description,
          shortDesc: form.shortDesc,
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
          metaKeywords: form.metaKeywords,
          sku: form.sku,
          totalStockGrams: form.totalStockGrams ? Number(form.totalStockGrams) : null,
          stockUnit: form.stockUnit,
          variants: variants.map((v, i) => ({
            weight: v.weight,
            price: Number(v.price),
            originalPrice: v.originalPrice ? Number(v.originalPrice) : undefined,
            discount: v.discount || undefined,
            sku: v.sku || undefined,
            gramsPerUnit: v.gramsPerUnit ? Number(v.gramsPerUnit) : undefined,
            sortOrder: i,
            isDefault: v.isDefault,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create product");

      toast.success("Product created successfully");
      router.push("/admin/products");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error creating product";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ---- SEO helpers ---- */
  const seoTitle = form.metaTitle || form.name || "Product Title";
  const seoDescription = form.metaDescription || form.description?.slice(0, 160) || "Product description...";
  const metaTitleLen = form.metaTitle.length;
  const metaDescLen = form.metaDescription.length;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/products">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Product</h1>
          <p className="text-sm text-muted-foreground">
            Add a new product to your catalog
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                <TabsTrigger value="variants" className="flex-1 relative">
                  Variants
                  {variants.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                      {variants.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
                <TabsTrigger value="inventory" className="flex-1">Inventory</TabsTrigger>
              </TabsList>

              {/* ============ GENERAL TAB ============ */}
              <TabsContent value="general" className="space-y-4 pt-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Blue Dream"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                  {errors.slug && <p className="text-sm text-red-500 mt-1">{errors.slug}</p>}
                  {slug && !errors.name && (
                    <p className="text-xs text-muted-foreground">
                      Slug: <span className="font-mono">{slug}</span>
                    </p>
                  )}
                </div>

                {/* Image Upload */}
                <div className="space-y-3">
                  <Label>Product Image</Label>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFileUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  {/* Drop zone */}
                  <div
                    className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                      dragOver
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    {uploading ? (
                      <div className="space-y-2">
                        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">
                          Uploading... {uploadProgress}%
                        </p>
                        <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="mx-auto size-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Drag & drop or{" "}
                          <button
                            type="button"
                            className="text-primary underline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            browse
                          </button>
                          {" "}• Max 10MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* URL fallback */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.image}
                      onChange={(e) => updateField("image", e.target.value)}
                      placeholder="Or paste an image URL..."
                      className="text-xs"
                    />
                    {form.image && (
                      <img
                        src={form.image}
                        alt="Preview"
                        className="size-9 shrink-0 rounded border object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>

                  {/* Uploaded images thumbnails */}
                  {uploadedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className={`group relative size-16 overflow-hidden rounded-md border-2 ${
                            form.image === img.url
                              ? "border-primary"
                              : "border-transparent hover:border-muted-foreground/50"
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="size-full cursor-pointer object-cover"
                            onClick={() => setPrimaryImage(img.url)}
                            title="Click to set as primary"
                          />
                          {form.image === img.url && (
                            <div className="absolute left-0.5 top-0.5">
                              <Badge className="h-4 bg-primary px-1 text-[9px]">Primary</Badge>
                            </div>
                          )}
                          <button
                            type="button"
                            className="absolute right-0.5 top-0.5 hidden size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                            onClick={() => removeUploadedImage(idx)}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category & THC */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(val) => {
                        updateField("category", val);
                        if (errors.category) setErrors((prev) => ({ ...prev, category: "" }));
                      }}
                    >
                      <SelectTrigger className={`w-full ${errors.category ? "border-red-500" : ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Indica">Indica</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Sativa">Sativa</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-sm text-red-500 mt-1">{errors.category}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thc">THCa %</Label>
                    <Input
                      id="thc"
                      value={form.thc}
                      onChange={(e) => updateField("thc", e.target.value)}
                      placeholder="24%"
                    />
                  </div>
                </div>

                {/* Popularity & Featured */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="popularity">Popularity Score</Label>
                    <Input
                      id="popularity"
                      type="number"
                      value={form.popularity}
                      onChange={(e) => updateField("popularity", e.target.value)}
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="featured"
                        checked={form.featured}
                        onCheckedChange={(checked) => updateField("featured", checked)}
                      />
                      <Label htmlFor="featured" className="cursor-pointer">
                        Featured product
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Full product description..."
                    rows={4}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                  )}
                </div>

                {/* Short Description */}
                <div className="space-y-2">
                  <Label htmlFor="shortDesc">Short Description</Label>
                  <Textarea
                    id="shortDesc"
                    value={form.shortDesc}
                    onChange={(e) => updateField("shortDesc", e.target.value)}
                    placeholder="Brief product summary..."
                    rows={2}
                  />
                </div>
              </TabsContent>

              {/* ============ VARIANTS TAB ============ */}
              <TabsContent value="variants" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Product Variants</h3>
                    <p className="text-sm text-muted-foreground">
                      Define the weight/price options customers can choose from.
                      {variants.length > 0 && (
                        <> The variant marked with <Star className="inline h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mx-0.5" /> is the <strong>default</strong> shown on the product card.</>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {variants.length === 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadDefaultVariants}
                      >
                        Load Defaults
                      </Button>
                    )}
                    <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewVariant({ ...emptyVariantForm })}
                        >
                          <Plus className="h-4 w-4" />
                          Add Variant
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Variant</DialogTitle>
                          <DialogDescription>
                            Create a new weight/price variant for this product.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="v-weight">Weight *</Label>
                              <Input
                                id="v-weight"
                                value={newVariant.weight}
                                onChange={(e) =>
                                  setNewVariant((prev) => ({ ...prev, weight: e.target.value }))
                                }
                                placeholder="e.g. 3g"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="v-price">Sale Price ($) *</Label>
                              <Input
                                id="v-price"
                                type="number"
                                step="0.01"
                                value={newVariant.price}
                                onChange={(e) =>
                                  setNewVariant((prev) => ({ ...prev, price: e.target.value }))
                                }
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="v-originalPrice">Original Price ($)</Label>
                              <Input
                                id="v-originalPrice"
                                type="number"
                                step="0.01"
                                value={newVariant.originalPrice}
                                onChange={(e) =>
                                  setNewVariant((prev) => ({
                                    ...prev,
                                    originalPrice: e.target.value,
                                  }))
                                }
                                placeholder="0.00"
                              />
                              <p className="text-xs text-muted-foreground">
                                Strikethrough price (leave blank if no discount)
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="v-discount">Discount Label</Label>
                              <Input
                                id="v-discount"
                                value={newVariant.discount}
                                onChange={(e) =>
                                  setNewVariant((prev) => ({ ...prev, discount: e.target.value }))
                                }
                                placeholder="e.g. 20%"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="v-sku">SKU</Label>
                              <Input
                                id="v-sku"
                                value={newVariant.sku}
                                onChange={(e) =>
                                  setNewVariant((prev) => ({ ...prev, sku: e.target.value }))
                                }
                                placeholder="Optional"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="v-grams">Grams per Unit</Label>
                              <Input
                                id="v-grams"
                                type="number"
                                value={newVariant.gramsPerUnit}
                                onChange={(e) =>
                                  setNewVariant((prev) => ({
                                    ...prev,
                                    gramsPerUnit: e.target.value,
                                  }))
                                }
                                placeholder="For stock deduction"
                              />
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setVariantDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            disabled={!newVariant.weight || !newVariant.price}
                            onClick={addVariant}
                          >
                            Add Variant
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {errors.variants && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {errors.variants}
                  </div>
                )}

                <Separator />

                {variants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <GripVertical className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No variants yet</p>
                    <p className="text-xs mt-1 max-w-[300px]">
                      Add variants to define the weight/price options for this product.
                      Or click &quot;Load Defaults&quot; to start with 1g, 3g, 15g, 28g.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={loadDefaultVariants}
                    >
                      Load Default Variants (1g, 3g, 15g, 28g)
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 text-center">Default</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead className="text-right">Sale Price</TableHead>
                            <TableHead className="text-right">Original Price</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Grams</TableHead>
                            <TableHead className="text-right w-[60px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variants.map((v) => (
                            <TableRow key={v.tempId} className={v.isDefault ? "bg-yellow-500/5" : ""}>
                              <TableCell className="text-center">
                                <button
                                  type="button"
                                  onClick={() => setDefaultVariant(v.tempId)}
                                  className="inline-flex items-center justify-center"
                                  title={v.isDefault ? "Default variant" : "Set as default"}
                                >
                                  <Star
                                    className={`h-4 w-4 transition-colors ${
                                      v.isDefault
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-muted-foreground/30 hover:text-yellow-500/50"
                                    }`}
                                  />
                                </button>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={v.weight}
                                  onChange={(e) => updateVariant(v.tempId, "weight", e.target.value)}
                                  className="h-8 w-20"
                                  placeholder="e.g. 3g"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={v.price}
                                  onChange={(e) => updateVariant(v.tempId, "price", e.target.value)}
                                  className="h-8 w-24 ml-auto text-right"
                                  placeholder="0.00"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={v.originalPrice}
                                  onChange={(e) => updateVariant(v.tempId, "originalPrice", e.target.value)}
                                  className="h-8 w-24 ml-auto text-right"
                                  placeholder="0.00"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={v.discount}
                                  onChange={(e) => updateVariant(v.tempId, "discount", e.target.value)}
                                  className="h-8 w-16"
                                  placeholder="20%"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={v.sku}
                                  onChange={(e) => updateVariant(v.tempId, "sku", e.target.value)}
                                  className="h-8 w-24"
                                  placeholder="SKU"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  value={v.gramsPerUnit}
                                  onChange={(e) => updateVariant(v.tempId, "gramsPerUnit", e.target.value)}
                                  className="h-8 w-16 ml-auto text-right"
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove variant?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove the {v.weight} variant. You can always add it back.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => removeVariant(v.tempId)}>
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <p>
                        Click the <Star className="inline h-3 w-3 text-yellow-500 fill-yellow-500 mx-0.5" /> to set which variant is shown as the default price on product cards.
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive">
                            Clear All
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear all variants?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all {variants.length} variants. You can load the defaults again or add them manually.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={clearAllVariants}>
                              Clear All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ============ SEO TAB ============ */}
              <TabsContent value="seo" className="space-y-4 pt-4">
                {/* Google Preview */}
                <div className="rounded-lg border bg-card/50 p-4 space-y-1">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Google Preview</p>
                  <p className="text-[#1a0dab] text-base font-medium truncate">
                    {seoTitle}
                  </p>
                  <p className="text-green-700 text-xs truncate">
                    yoursite.com/product/{slug || "product-slug"}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {seoDescription}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={form.metaTitle}
                    onChange={(e) => updateField("metaTitle", e.target.value)}
                    placeholder="SEO page title"
                  />
                  <p className={`text-xs ${charCountColor(metaTitleLen, 30, 60)}`}>
                    {metaTitleLen}/60 characters {metaTitleLen >= 30 && metaTitleLen <= 60 && "✓"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={form.metaDescription}
                    onChange={(e) => updateField("metaDescription", e.target.value)}
                    placeholder="SEO meta description..."
                    rows={3}
                  />
                  <p className={`text-xs ${charCountColor(metaDescLen, 120, 160)}`}>
                    {metaDescLen}/160 characters {metaDescLen >= 120 && metaDescLen <= 160 && "✓"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaKeywords">Meta Keywords</Label>
                  <Input
                    id="metaKeywords"
                    value={form.metaKeywords}
                    onChange={(e) => updateField("metaKeywords", e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </TabsContent>

              {/* ============ INVENTORY TAB ============ */}
              <TabsContent value="inventory" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">Product SKU</Label>
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => updateField("sku", e.target.value)}
                    placeholder="e.g. BD-001"
                  />
                  <p className="text-xs text-muted-foreground">
                    Master SKU for this product. Variants can have their own SKUs.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalStockGrams">Total Stock</Label>
                    <Input
                      id="totalStockGrams"
                      type="number"
                      value={form.totalStockGrams}
                      onChange={(e) => updateField("totalStockGrams", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Unit</Label>
                    <Select
                      value={form.stockUnit}
                      onValueChange={(val) => updateField("stockUnit", val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grams">Grams</SelectItem>
                        <SelectItem value="units">Units</SelectItem>
                        <SelectItem value="ounces">Ounces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Stock will be deducted automatically when orders are placed, based on each variant&apos;s &quot;Grams per Unit&quot; value.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center gap-3 pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save />
                Create Product
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          {variants.length > 0 && (
            <p className="text-xs text-muted-foreground ml-auto">
              {variants.length} variant{variants.length !== 1 ? "s" : ""} will be created
              {variants.find((v) => v.isDefault) && (
                <> &middot; Default: <strong>{variants.find((v) => v.isDefault)?.weight}</strong></>
              )}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  ImageIcon,
  History,
  Minus,
  Search,
  X,
  Link2,
  Star,
  GripVertical,
  Upload,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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

interface Variant {
  id?: string;
  weight: string;
  price: number;
  originalPrice: number;
  discount: string;
  sku: string;
  gramsPerUnit: number;
  sortOrder: number;
  isActive: boolean;
  isDefault?: boolean;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  adminName: string | null;
  createdAt: string;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

interface ProductForm {
  name: string;
  slug: string;
  image: string;
  category: string;
  thc: string;
  popularity: string;
  featured: boolean;
  isActive: boolean;
  description: string;
  shortDesc: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  sku: string;
  totalStockGrams: string;
  stockUnit: string;
  reorderPoint: string;
}

interface NewVariantForm {
  weight: string;
  price: string;
  originalPrice: string;
  discount: string;
  sku: string;
  gramsPerUnit: string;
  sortOrder: string;
  isActive: boolean;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  salePrice: number;
}

const emptyVariantForm: NewVariantForm = {
  weight: "",
  price: "",
  originalPrice: "",
  discount: "",
  sku: "",
  gramsPerUnit: "",
  sortOrder: "0",
  isActive: true,
};

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

/** Returns color class based on character count vs recommended range */
function charCountColor(len: number, min: number, max: number): string {
  if (len === 0) return "text-muted-foreground";
  if (len >= min && len <= max) return "text-green-500";
  if (len > max) return "text-red-500";
  if (len >= min - 10) return "text-yellow-500";
  return "text-muted-foreground";
}
/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [initialFormState, setInitialFormState] = useState<string>("");
  const [productLoaded, setProductLoaded] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string>("");

  const [form, setForm] = useState<ProductForm>({
    name: "",
    slug: "",
    image: "",
    category: "Indica",
    thc: "",
    popularity: "0",
    featured: false,
    isActive: true,
    description: "",
    shortDesc: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    sku: "",
    totalStockGrams: "",
    stockUnit: "grams",
    reorderPoint: "0",
  });

  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [newVariant, setNewVariant] = useState<NewVariantForm>({ ...emptyVariantForm });
  const [addingVariant, setAddingVariant] = useState(false);
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  // Inventory state
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("Restock");
  const [adjusting, setAdjusting] = useState(false);

  // Related products state
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedSaving, setRelatedSaving] = useState(false);
  const [relatedSearch, setRelatedSearch] = useState("");
  const [relatedSearchResults, setRelatedSearchResults] = useState<RelatedProduct[]>([]);
  const [relatedSearching, setRelatedSearching] = useState(false);
  const [showRelatedDropdown, setShowRelatedDropdown] = useState(false);
  const relatedSearchRef = useRef<HTMLDivElement>(null);

  // Image gallery state
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Get the default variant ---- */
  const getDefaultVariant = useCallback((): Variant | undefined => {
    if (variants.length === 0) return undefined;
    const marked = variants.find((v) => v.isDefault);
    if (marked) return marked;
    // Fall back to first by sortOrder
    const sorted = [...variants].sort((a, b) => a.sortOrder - b.sortOrder);
    return sorted[0];
  }, [variants]);

  /* ---- Set default variant locally ---- */
  const setDefaultVariant = (variantId: string) => {
    setVariants((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.id === variantId }))
    );
  };

  /* ---- Fetch product ---- */
  const fetchProduct = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/products/${id}?include=variants`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Product not found");
        return r.json();
      })
      .then((data) => {
        const p = data.data || data;
        setForm({
          name: p.name ?? "",
          slug: p.slug ?? "",
          image: p.image ?? "",
          category: p.category ?? "Indica",
          thc: p.thc ?? "",
          popularity: String(p.popularity ?? 0),
          featured: !!p.featured,
          isActive: p.isActive !== false,
          description: p.description ?? "",
          shortDesc: p.shortDesc ?? "",
          metaTitle: p.metaTitle ?? "",
          metaDescription: p.metaDescription ?? "",
          metaKeywords: p.metaKeywords ?? "",
          sku: p.sku ?? "",
          totalStockGrams: p.totalStockGrams != null ? String(p.totalStockGrams) : "",
          stockUnit: p.stockUnit ?? "grams",
          reorderPoint: p.reorderPoint != null ? String(p.reorderPoint) : "0",
        });
        const loadedVariants: Variant[] = (p.variants ?? []).map((v: Variant) => ({
          ...v,
          isDefault: v.isDefault ?? false,
        }));
        // If no variant is marked as default, mark the first by sortOrder
        if (loadedVariants.length > 0 && !loadedVariants.some((v) => v.isDefault)) {
          const sorted = [...loadedVariants].sort((a, b) => a.sortOrder - b.sortOrder);
          const firstId = sorted[0].id;
          loadedVariants.forEach((v) => {
            v.isDefault = v.id === firstId;
          });
        }
        setVariants(loadedVariants);
        setProductLoaded(true);
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);


  const fetchStockHistory = useCallback(() => {
    setStockLoading(true);
    fetch(`/api/admin/products/${id}/stock/history`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStockMovements(data.data || []))
      .catch(() => {})
      .finally(() => setStockLoading(false));
  }, [id]);

  const fetchRelatedProducts = useCallback(() => {
    setRelatedLoading(true);
    fetch(`/api/admin/products/${id}/related`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setRelatedProducts(data.data || []))
      .catch(() => {})
      .finally(() => setRelatedLoading(false));
  }, [id]);

  const fetchImages = useCallback(() => {
    setImagesLoading(true);
    fetch(`/api/admin/products/${id}/images`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setProductImages(data.data || []))
      .catch(() => {})
      .finally(() => setImagesLoading(false));
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchStockHistory();
    fetchRelatedProducts();
    fetchImages();
  }, [fetchProduct, fetchStockHistory, fetchRelatedProducts, fetchImages]);

  /* ---- Image upload handler ---- */
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    let uploaded = 0;
    for (const file of fileArray) {
      try {
        // 1. Upload file to /api/upload
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error?.message || "Upload failed");
        }
        const uploadData = await uploadRes.json();
        const url = uploadData.data?.url || uploadData.url;

        // 2. Create ProductImage record
        const imageRes = await fetch(`/api/admin/products/${id}/images`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            alt: file.name.replace(/\.[^.]+$/, ""),
            isPrimary: productImages.length === 0 && uploaded === 0,
          }),
        });
        if (!imageRes.ok) throw new Error("Failed to save image record");

        uploaded++;
        setUploadProgress(Math.round((uploaded / fileArray.length) * 100));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} image${uploaded > 1 ? "s" : ""} uploaded`);
      fetchImages();

      // Update product primary image if this is the first image
      if (productImages.length === 0) {
        fetchProduct();
      }
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleAddImageUrl = async () => {
    if (!imageUrl.trim()) return;
    try {
      const res = await fetch(`/api/admin/products/${id}/images`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl.trim(),
          alt: imageAlt.trim() || null,
          isPrimary: productImages.length === 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to add image");
      toast.success("Image added");
      setImageUrl("");
      setImageAlt("");
      setUrlDialogOpen(false);
      fetchImages();
    } catch {
      toast.error("Failed to add image");
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // Use the existing POST endpoint with isPrimary flag (it unsets others)
      const img = productImages.find((i) => i.id === imageId);
      if (!img) return;

      // Delete and re-create with isPrimary — or better, add a PUT endpoint
      // For now, update locally + update product image field
      const res = await fetch(`/api/admin/products/${id}/images`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: img.url,
          alt: img.alt,
          isPrimary: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to set primary");

      // Delete old entry
      await fetch(`/api/admin/products/${id}/images`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });

      // Update product-level image field too
      await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img.url }),
      });

      toast.success("Primary image updated");
      fetchImages();
      fetchProduct();
    } catch {
      toast.error("Failed to set primary image");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}/images`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) throw new Error("Failed to delete image");
      toast.success("Image removed");
      fetchImages();
    } catch {
      toast.error("Failed to remove image");
    }
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


  /* ---- Close related search dropdown on outside click ---- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (relatedSearchRef.current && !relatedSearchRef.current.contains(e.target as Node)) {
        setShowRelatedDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  /* ---- Unsaved changes detection ---- */
  useEffect(() => {
    if (productLoaded && !initialFormState) {
      setInitialFormState(JSON.stringify(form));
    }
  }, [productLoaded, initialFormState, form]);

  const currentFormState = JSON.stringify(form);
  const hasChanges = initialFormState !== "" && currentFormState !== initialFormState;

  useKeyboardShortcut([
    {
      key: "s",
      modifiers: ["ctrl"],
      handler: () => {
        const formEl = document.querySelector("form");
        if (formEl) formEl.requestSubmit();
      },
    },
    {
      key: "Escape",
      handler: () => {
        if (hasChanges) {
          setShowLeaveDialog(true);
        } else {
          router.push("/admin/products");
        }
      },
    },
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handleNavigation = (href: string) => {
    if (hasChanges) {
      setPendingNavigation(href);
      setShowLeaveDialog(true);
    } else {
      router.push(href);
    }
  };

  /* ---- Field updater ---- */
  const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof key === "string" && errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  /* ---- Update variant field locally ---- */
  const updateVariantField = (variantId: string, field: keyof Variant, value: unknown) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [field]: value } : v))
    );
  };

  /* ---- Auto-save variant field on blur ---- */
  const handleSaveVariantField = async (variantId: string, field: string, value: unknown) => {
    setSavingVariantId(variantId);
    try {
      const res = await fetch(`/api/admin/products/${id}/variants`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Variant updated");
    } catch {
      toast.error("Failed to update variant");
      fetchProduct(); // revert to server state
    } finally {
      setSavingVariantId(null);
    }
  };

  /* ---- Validation ---- */
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Product name is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    if (!form.category) errs.category = "Category is required";
    if (!form.description.trim()) errs.description = "Description is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ---- Save product ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setSaving(true);

    // Derive salePrice and originalPrice from the default variant
    const defaultVar = getDefaultVariant();
    const salePrice = defaultVar ? Number(defaultVar.price) : 0;
    const originalPrice = defaultVar
      ? (Number(defaultVar.originalPrice) || Number(defaultVar.price))
      : 0;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          salePrice,
          originalPrice,
          image: form.image,
          category: form.category,
          thc: form.thc,
          popularity: Number(form.popularity),
          featured: form.featured,
          isActive: form.isActive,
          description: form.description,
          shortDesc: form.shortDesc,
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
          metaKeywords: form.metaKeywords,
          sku: form.sku,
          totalStockGrams: form.totalStockGrams ? Number(form.totalStockGrams) : null,
          stockUnit: form.stockUnit,
          reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to update product");

      setInitialFormState(JSON.stringify(form));
      toast.success("Product saved successfully");
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating product");
    } finally {
      setSaving(false);
    }
  };


  const handleStockAdjust = async () => {
    if (!adjustQuantity) return;
    setAdjusting(true);
    try {
      const currentStock = form.totalStockGrams ? Number(form.totalStockGrams) : 0;
      const newStock = currentStock + Number(adjustQuantity);
      const res = await fetch(`/api/admin/products/${id}/stock`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalStockGrams: Math.max(0, newStock), reason: adjustReason }),
      });
      if (!res.ok) throw new Error("Failed");
      updateField("totalStockGrams", String(Math.max(0, newStock)));
      setAdjustQuantity("");
      setAdjustReason("Restock");
      fetchStockHistory();
    } catch { /* silent */ }
    finally { setAdjusting(false); }
  };

  /* ---- Add variant ---- */
  const handleAddVariant = async () => {
    setAddingVariant(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/variants`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: newVariant.weight,
          price: Number(newVariant.price),
          originalPrice: Number(newVariant.originalPrice),
          discount: newVariant.discount,
          sku: newVariant.sku,
          gramsPerUnit: Number(newVariant.gramsPerUnit),
          sortOrder: Number(newVariant.sortOrder),
          isActive: newVariant.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to add variant");
      }

      setNewVariant({ ...emptyVariantForm });
      setVariantDialogOpen(false);
      toast.success("Variant added");
      fetchProduct();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding variant");
    } finally {
      setAddingVariant(false);
    }
  };

  /* ---- Delete variant ---- */
  const handleDeleteVariant = async (variantId: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}/variants`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      if (!res.ok) throw new Error("Failed to delete variant");
      toast.success("Variant deleted");
      fetchProduct();
    } catch {
      toast.error("Failed to delete variant");
    }
  };

  /* ---- Related products search ---- */
  const searchProducts = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setRelatedSearchResults([]);
        return;
      }
      setRelatedSearching(true);
      try {
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}&limit=10`, {
          credentials: "include",
        });
        const data = await res.json();
        const products: RelatedProduct[] = (data.data || [])
          .filter((p: RelatedProduct) => p.id !== id)
          .filter((p: RelatedProduct) => !relatedProducts.some((rp) => rp.id === p.id))
          .map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            slug: p.slug as string,
            image: p.image as string,
            category: p.category as string,
            salePrice: Number(p.salePrice),
          }));
        setRelatedSearchResults(products);
      } catch {
        setRelatedSearchResults([]);
      } finally {
        setRelatedSearching(false);
      }
    },
    [id, relatedProducts]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (relatedSearch) {
        searchProducts(relatedSearch);
        setShowRelatedDropdown(true);
      } else {
        setRelatedSearchResults([]);
        setShowRelatedDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [relatedSearch, searchProducts]);

  const addRelatedProduct = (product: RelatedProduct) => {
    if (relatedProducts.length >= 8) return;
    setRelatedProducts((prev) => [...prev, product]);
    setRelatedSearch("");
    setRelatedSearchResults([]);
    setShowRelatedDropdown(false);
  };

  const removeRelatedProduct = (productId: string) => {
    setRelatedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const saveRelatedProducts = async () => {
    setRelatedSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/related`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relatedProductIds: relatedProducts.map((p) => p.id),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Related products saved");
    } catch {
      toast.error("Failed to save related products");
    } finally {
      setRelatedSaving(false);
    }
  };

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- SEO helpers ---- */
  const seoTitle = form.metaTitle || form.name;
  const seoDescription = form.metaDescription || form.description?.slice(0, 160);
  const metaTitleLen = form.metaTitle.length;
  const metaDescLen = form.metaDescription.length;

  /* ---- Derived default variant for display ---- */
  const defaultVariant = getDefaultVariant();

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => handleNavigation("/admin/products")}>
            <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-sm text-muted-foreground">
            {form.name || "Untitled"}
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
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                <TabsTrigger value="variants" className="flex-1">Variants</TabsTrigger>
                <TabsTrigger value="images" className="flex-1">Images</TabsTrigger>
                <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
                <TabsTrigger value="inventory" className="flex-1">Inventory</TabsTrigger>
                <TabsTrigger value="related" className="flex-1">Related</TabsTrigger>
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
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => updateField("slug", e.target.value)}
                      className={errors.slug ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateField("slug", slugify(form.name))}
                    >
                      Auto
                    </Button>
                  </div>
                  {errors.slug && <p className="text-sm text-red-500 mt-1">{errors.slug}</p>}
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="image">Image URL *</Label>
                  <Input
                    id="image"
                    value={form.image}
                    onChange={(e) => updateField("image", e.target.value)}
                    placeholder="/strains/product-name.png"
                  />
                </div>

                {/* Category & THC */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(val) => { updateField("category", val); if (errors.category) setErrors((prev) => ({ ...prev, category: "" })); }}
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
                    {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thc">THC % *</Label>
                    <Input
                      id="thc"
                      value={form.thc}
                      onChange={(e) => updateField("thc", e.target.value)}
                    />
                  </div>
                </div>

                {/* Popularity & Featured/Active */}
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
                  <div className="flex flex-col justify-end gap-3 pb-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="featured"
                        checked={form.featured}
                        onCheckedChange={(checked) => updateField("featured", checked)}
                      />
                      <Label htmlFor="featured" className="cursor-pointer">
                        Featured
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="isActive"
                        checked={form.isActive}
                        onCheckedChange={(checked) => updateField("isActive", checked)}
                      />
                      <Label htmlFor="isActive" className="cursor-pointer">
                        Active
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
                  {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
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

                {/* Default variant price info */}
                {defaultVariant && (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    <p>
                      Product-level prices are derived from the default variant ({defaultVariant.weight}):
                      <strong className="text-foreground ml-1">
                        ${Number(defaultVariant.price).toFixed(2)}
                      </strong>
                      {Number(defaultVariant.originalPrice) > 0 && Number(defaultVariant.originalPrice) !== Number(defaultVariant.price) && (
                        <span className="ml-2 line-through">
                          ${Number(defaultVariant.originalPrice).toFixed(2)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-1">
                      To change the product price, edit the default variant in the Variants tab.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* ============ VARIANTS TAB ============ */}
              <TabsContent value="variants" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Product Variants</h3>
                    <p className="text-sm text-muted-foreground">
                      {variants.length} variant{variants.length !== 1 ? "s" : ""}
                      {defaultVariant && (
                        <> &middot; Default: <strong>{defaultVariant.weight}</strong></>
                      )}
                    </p>
                  </div>

                  <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewVariant({ ...emptyVariantForm })}
                      >
                        <Plus />
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
                            <Label htmlFor="v-price">Price ($) *</Label>
                            <Input
                              id="v-price"
                              type="number"
                              step="0.01"
                              value={newVariant.price}
                              onChange={(e) =>
                                setNewVariant((prev) => ({ ...prev, price: e.target.value }))
                              }
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
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="v-discount">Discount</Label>
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
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="v-sort">Sort Order</Label>
                            <Input
                              id="v-sort"
                              type="number"
                              value={newVariant.sortOrder}
                              onChange={(e) =>
                                setNewVariant((prev) => ({
                                  ...prev,
                                  sortOrder: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <div className="flex items-center gap-2">
                              <Switch
                                id="v-active"
                                checked={newVariant.isActive}
                                onCheckedChange={(checked) =>
                                  setNewVariant((prev) => ({ ...prev, isActive: checked }))
                                }
                              />
                              <Label htmlFor="v-active" className="cursor-pointer">
                                Active
                              </Label>
                            </div>
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
                          disabled={!newVariant.weight || !newVariant.price || addingVariant}
                          onClick={handleAddVariant}
                        >
                          {addingVariant ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Variant"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Separator />

                {variants.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <> The variant marked with <Star className="inline h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mx-0.5" /> is the <strong>default</strong> shown on the product card. Fields auto-save when you leave them.</>
                  </p>
                )}

                {variants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <GripVertical className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No variants yet.</p>
                    <p className="text-xs">Click &quot;Add Variant&quot; to create one.</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center w-[50px]">Default</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Original</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Grams</TableHead>
                            <TableHead className="text-right w-[60px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variants.map((v) => (
                            <TableRow key={v.id || v.weight} className={v.isDefault ? "bg-yellow-500/5" : ""}>
                              <TableCell className="text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (v.id) setDefaultVariant(v.id);
                                  }}
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
                                  onChange={(e) => {
                                    if (v.id) updateVariantField(v.id, "weight", e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    if (v.id) handleSaveVariantField(v.id, "weight", e.target.value);
                                  }}
                                  className="h-8 w-20"
                                  placeholder="e.g. 3g"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={v.price}
                                  onChange={(e) => {
                                    if (v.id) updateVariantField(v.id, "price", Number(e.target.value));
                                  }}
                                  onBlur={(e) => {
                                    if (v.id) handleSaveVariantField(v.id, "price", Number(e.target.value));
                                  }}
                                  className="h-8 w-24 ml-auto text-right"
                                  placeholder="0.00"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={v.originalPrice}
                                  onChange={(e) => {
                                    if (v.id) updateVariantField(v.id, "originalPrice", Number(e.target.value));
                                  }}
                                  onBlur={(e) => {
                                    if (v.id) handleSaveVariantField(v.id, "originalPrice", Number(e.target.value));
                                  }}
                                  className="h-8 w-24 ml-auto text-right"
                                  placeholder="0.00"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={v.discount}
                                  onChange={(e) => {
                                    if (v.id) updateVariantField(v.id, "discount", e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    if (v.id) handleSaveVariantField(v.id, "discount", e.target.value);
                                  }}
                                  className="h-8 w-16"
                                  placeholder="20%"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={v.sku}
                                  onChange={(e) => {
                                    if (v.id) updateVariantField(v.id, "sku", e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    if (v.id) handleSaveVariantField(v.id, "sku", e.target.value);
                                  }}
                                  className="h-8 w-24"
                                  placeholder="SKU"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  value={v.gramsPerUnit}
                                  onChange={(e) => {
                                    if (v.id) updateVariantField(v.id, "gramsPerUnit", Number(e.target.value));
                                  }}
                                  onBlur={(e) => {
                                    if (v.id) handleSaveVariantField(v.id, "gramsPerUnit", Number(e.target.value));
                                  }}
                                  className="h-8 w-16 ml-auto text-right"
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {v.id && (
                                  <div className="flex items-center justify-end gap-1">
                                    {savingVariantId === v.id && (
                                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    )}
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
                                          <AlertDialogTitle>Delete Variant</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete the {v.weight} variant?
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            variant="destructive"
                                            onClick={() => handleDeleteVariant(v.id!)}
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
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
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ============ IMAGES TAB ============ */}
              <TabsContent value="images" className="space-y-4 pt-4">
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

                {/* Upload area */}
                <div
                  className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="mx-auto size-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Uploading... {uploadProgress}%
                      </p>
                      <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="mx-auto size-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Drag & drop images here
                        </p>
                        <p className="text-xs text-muted-foreground">
                          or click to browse • JPEG, PNG, WebP, GIF, SVG • Max 10MB
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 size-4" />
                          Browse Files
                        </Button>
                        <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="ghost" size="sm">
                              <Link2 className="mr-2 size-4" />
                              Add by URL
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Image by URL</DialogTitle>
                              <DialogDescription>
                                Paste an image URL to add it to the gallery
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                              <div className="space-y-1">
                                <Label>Image URL</Label>
                                <Input
                                  value={imageUrl}
                                  onChange={(e) => setImageUrl(e.target.value)}
                                  placeholder="https://example.com/image.jpg"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Alt Text (optional)</Label>
                                <Input
                                  value={imageAlt}
                                  onChange={(e) => setImageAlt(e.target.value)}
                                  placeholder="Description of the image"
                                />
                              </div>
                              {imageUrl && (
                                <div className="rounded border bg-muted p-2">
                                  <img
                                    src={imageUrl}
                                    alt="Preview"
                                    className="mx-auto max-h-40 rounded object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUrlDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleAddImageUrl}
                                disabled={!imageUrl.trim()}
                              >
                                Add Image
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Primary Image */}
                {form.image && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={form.image}
                        alt={form.name}
                        className="size-16 rounded-md border object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.svg"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Crown className="size-4 text-yellow-500" />
                          <span className="text-sm font-medium">Primary Image</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{form.image}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Input
                          value={form.image}
                          onChange={(e) => updateField("image", e.target.value)}
                          placeholder="Image URL"
                          className="w-64 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Image Gallery */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">
                      Gallery ({productImages.length} image{productImages.length !== 1 ? "s" : ""})
                    </Label>
                  </div>

                  {imagesLoading ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                      ))}
                    </div>
                  ) : productImages.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-8 text-center">
                      <ImageIcon className="mx-auto size-10 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No gallery images yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Upload images above to build your product gallery
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {productImages.map((img) => (
                        <div
                          key={img.id}
                          className="group relative overflow-hidden rounded-lg border bg-muted"
                        >
                          <div className="aspect-square">
                            <img
                              src={img.url}
                              alt={img.alt || "Product image"}
                              className="size-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder-product.svg";
                              }}
                            />
                          </div>

                          {/* Primary badge */}
                          {img.isPrimary && (
                            <div className="absolute left-2 top-2">
                              <Badge variant="default" className="bg-yellow-600 text-xs">
                                <Crown className="mr-1 size-3" />
                                Primary
                              </Badge>
                            </div>
                          )}

                          {/* Hover overlay with actions */}
                          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="flex w-full items-center justify-between p-2">
                              {!img.isPrimary && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleSetPrimary(img.id)}
                                >
                                  <Crown className="mr-1 size-3" />
                                  Set Primary
                                </Button>
                              )}
                              {img.isPrimary && <span />}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 text-xs"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove this image from the product gallery.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteImage(img.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ============ SEO TAB ============ */}
              <TabsContent value="seo" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={form.metaTitle}
                    onChange={(e) => updateField("metaTitle", e.target.value)}
                    placeholder="SEO page title"
                  />
                  <p className={`text-xs ${charCountColor(metaTitleLen, 50, 60)}`}>
                    {metaTitleLen}/60 characters
                    {metaTitleLen > 0 && metaTitleLen < 50 && " (recommended: 50-60)"}
                    {metaTitleLen >= 50 && metaTitleLen <= 60 && " — Good length"}
                    {metaTitleLen > 60 && " — Too long, may be truncated in search results"}
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
                  <p className={`text-xs ${charCountColor(metaDescLen, 150, 160)}`}>
                    {metaDescLen}/160 characters
                    {metaDescLen > 0 && metaDescLen < 150 && " (recommended: 150-160)"}
                    {metaDescLen >= 150 && metaDescLen <= 160 && " — Good length"}
                    {metaDescLen > 160 && " — Too long, may be truncated in search results"}
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

                {/* Google Search Preview */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base">Search Preview</CardTitle>
                    <CardDescription>How this product appears in Google search results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white rounded-lg p-4 text-left">
                      {/* Title - blue link style */}
                      <div
                        className="text-[#1a0dab] text-xl font-normal leading-tight truncate"
                        style={{ fontFamily: "Arial, sans-serif" }}
                      >
                        {seoTitle || "Product Name"} | ResinPlug
                      </div>
                      {/* URL - green */}
                      <div
                        className="text-[#006621] text-sm mt-1"
                        style={{ fontFamily: "Arial, sans-serif" }}
                      >
                        resinplug.com/product/{form.slug || "product-slug"}
                      </div>
                      {/* Description - dark gray */}
                      <div
                        className="text-[#545454] text-sm mt-1 line-clamp-2"
                        style={{ fontFamily: "Arial, sans-serif" }}
                      >
                        {seoDescription || "Product description will appear here..."}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ INVENTORY TAB ============ */}
              <TabsContent value="inventory" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" value={form.sku} onChange={(e) => updateField("sku", e.target.value)} placeholder="e.g. BD-001" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalStockGrams">Current Stock ({form.stockUnit})</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => { const cur = Number(form.totalStockGrams) || 0; updateField("totalStockGrams", String(Math.max(0, cur - 1))); }}><Minus className="h-3 w-3" /></Button>
                      <Input id="totalStockGrams" type="number" value={form.totalStockGrams} onChange={(e) => updateField("totalStockGrams", e.target.value)} placeholder="0" className="text-center" />
                      <Button type="button" variant="outline" size="sm" onClick={() => { const cur = Number(form.totalStockGrams) || 0; updateField("totalStockGrams", String(cur + 1)); }}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Unit</Label>
                    <Select value={form.stockUnit} onValueChange={(val) => updateField("stockUnit", val)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grams">Grams</SelectItem><SelectItem value="units">Units</SelectItem><SelectItem value="ounces">Ounces</SelectItem></SelectContent></Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reorderPoint">Reorder Point</Label>
                    <Input id="reorderPoint" type="number" value={form.reorderPoint} onChange={(e) => updateField("reorderPoint", e.target.value)} placeholder="0" />
                    <p className="text-xs text-muted-foreground">Alert when stock falls below this level</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Low Stock Warning</Label>
                    <div className="flex items-center gap-2 h-9">
                      {Number(form.totalStockGrams || 0) <= Number(form.reorderPoint || 0) && Number(form.reorderPoint || 0) > 0 ? (<Badge variant="destructive">Low Stock</Badge>) : (<Badge variant="secondary">Stock OK</Badge>)}
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Adjust Stock</h4>
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Quantity (+/-)</Label><Input type="number" value={adjustQuantity} onChange={(e) => setAdjustQuantity(e.target.value)} placeholder="e.g. 50 or -10" /></div>
                      <div className="space-y-1.5"><Label>Reason</Label><Select value={adjustReason} onValueChange={setAdjustReason}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Restock">Restock</SelectItem><SelectItem value="Damage">Damage</SelectItem><SelectItem value="Correction">Correction</SelectItem><SelectItem value="Return">Return</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                    </div>
                    <Button type="button" size="sm" onClick={handleStockAdjust} disabled={adjusting || !adjustQuantity}>{adjusting ? "Adjusting..." : "Apply Adjustment"}</Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><History className="h-4 w-4" /> Stock Movement History</h4>
                  {stockLoading ? (<div className="text-sm text-muted-foreground">Loading...</div>) : stockMovements.length === 0 ? (<div className="text-sm text-muted-foreground text-center py-4">No stock movements recorded yet.</div>) : (
                    <div className="rounded-md border">
                      <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Reason</TableHead><TableHead>Admin</TableHead></TableRow></TableHeader>
                        <TableBody>{stockMovements.map((m) => (<TableRow key={m.id}><TableCell className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell><TableCell><Badge variant={m.type === "restock" ? "default" : m.type === "adjustment" ? "secondary" : "outline"}>{m.type}</Badge></TableCell><TableCell className={"text-right font-medium " + (m.quantity >= 0 ? "text-green-500" : "text-red-500")}>{m.quantity >= 0 ? "+" : ""}{m.quantity}</TableCell><TableCell className="text-sm text-muted-foreground">{m.reason || "-"}</TableCell><TableCell className="text-sm text-muted-foreground">{m.adminName || "-"}</TableCell></TableRow>))}</TableBody></Table>
                    </div>
                  )}
                </div>

                <Separator />

                {variants.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Per-Variant Stock</h4>
                    <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Variant</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Grams/Unit</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader><TableBody>{variants.map((v) => (<TableRow key={v.id || v.weight}><TableCell className="font-medium">{v.weight}</TableCell><TableCell className="text-muted-foreground font-mono text-xs">{v.sku || "-"}</TableCell><TableCell className="text-right">{v.gramsPerUnit ?? "-"}</TableCell><TableCell className="text-center"><Badge variant={v.isActive ? "default" : "secondary"}>{v.isActive ? "Active" : "Inactive"}</Badge></TableCell></TableRow>))}</TableBody></Table></div>
                  </div>
                )}              </TabsContent>
              {/* ============ RELATED PRODUCTS TAB ============ */}
              <TabsContent value="related" className="space-y-4 pt-4">
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Related Products
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select up to 8 products to display as related items on the product page.
                  </p>
                </div>

                <Separator />

                {/* Search bar */}
                <div className="relative" ref={relatedSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={relatedProducts.length >= 8 ? "Maximum 8 related products reached" : "Search products to add..."}
                      value={relatedSearch}
                      onChange={(e) => setRelatedSearch(e.target.value)}
                      onFocus={() => { if (relatedSearchResults.length > 0) setShowRelatedDropdown(true); }}
                      className="pl-9"
                      disabled={relatedProducts.length >= 8}
                    />
                    {relatedSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {showRelatedDropdown && relatedSearchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
                      {relatedSearchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                          onClick={() => addRelatedProduct(product)}
                        >
                          <img
                            src={product.image || "/placeholder-product.svg"}
                            alt={product.name}
                            className="h-8 w-8 rounded border object-cover bg-muted flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.svg"; }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">${product.salePrice.toFixed(2)}</p>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0 text-xs">
                            {product.category}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {showRelatedDropdown && relatedSearch && !relatedSearching && relatedSearchResults.length === 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-center text-sm text-muted-foreground">
                      No products found matching &quot;{relatedSearch}&quot;
                    </div>
                  )}
                </div>

                {relatedProducts.length >= 8 && (
                  <p className="text-sm text-yellow-500">
                    Maximum of 8 related products reached. Remove one to add another.
                  </p>
                )}

                {/* Current related products list */}
                {relatedLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : relatedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Link2 className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No related products added yet.</p>
                    <p className="text-xs">Use the search bar above to find and add products.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relatedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <img
                          src={product.image || "/placeholder-product.svg"}
                          alt={product.name}
                          className="h-10 w-10 rounded border object-cover bg-muted flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.svg"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${product.salePrice.toFixed(2)}
                          </p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0 text-xs">
                          {product.category}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => removeRelatedProduct(product.id)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {relatedProducts.length}/8 products selected
                  </p>
                  <Button
                    type="button"
                    onClick={saveRelatedProducts}
                    disabled={relatedSaving}
                  >
                    {relatedSaving ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Related Products
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center gap-3 pt-6">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Unsaved changes
            </Badge>
          )}
          {defaultVariant && (
            <span className="text-xs text-muted-foreground">
              Saves with default variant price: ${Number(defaultVariant.price).toFixed(2)}
            </span>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save />
                Save Changes
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => handleNavigation("/admin/products")}>Cancel</Button>
        </div>
      </form>


      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave this page?
              Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLeaveDialog(false)}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setShowLeaveDialog(false);
                router.push(pendingNavigation);
              }}
            >
              Leave Page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

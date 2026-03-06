"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles, Star, Loader2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  image: string;
  reviewCount: number;
}

export default function ReviewGeneratorPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [count, setCount] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<{
    productName: string;
    generated: number;
    totalReviews: number;
  } | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/review-generator", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const json = await res.json();
      setProducts(json.data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleGenerate = async () => {
    if (!selectedProductId) {
      toast.error("Please select a product first");
      return;
    }

    setGenerating(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/review-generator", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, count }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Generation failed");
      }

      const json = await res.json();
      setLastResult(json.data);
      toast.success(`Generated ${json.data.generated} reviews for ${json.data.productName}`);

      // Refresh product list to update counts
      await fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const totalReviews = products.reduce((sum, p) => sum + p.reviewCount, 0);

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "Indica":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Sativa":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "Hybrid":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Generator</h1>
        <p className="text-muted-foreground">
          Generate realistic reviews for any product. Reviews are unique per product with varied ratings, lengths, and styles.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Reviews</p>
            <p className="text-2xl font-bold">{loading ? "..." : totalReviews.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Products</p>
            <p className="text-2xl font-bold">{loading ? "..." : products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Reviews/Product</p>
            <p className="text-2xl font-bold">
              {loading || products.length === 0
                ? "..."
                : Math.round(totalReviews / products.length)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Generator Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            Generate Reviews
          </CardTitle>
          <CardDescription>
            Select a product and specify how many reviews to generate. Reviews will have realistic ratings
            (70% 5-star, 25% 4-star, 5% 3-star), varied lengths, spelling mistakes, and strain-specific
            flavor/effect mentions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label>Product</Label>
            {selectedProduct ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.category} &middot; {selectedProduct.reviewCount} existing reviews
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedProductId(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a product from the table below</p>
            )}
          </div>

          {/* Count + Generate */}
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="review-count">Number of reviews</Label>
              <Input
                id="review-count"
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10) || 10)}
                className="w-32"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!selectedProductId || generating}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Reviews
                </>
              )}
            </Button>
          </div>

          {/* Result */}
          {lastResult && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-green-500/30 bg-green-500/10">
              <Check className="size-4 text-green-500" />
              <p className="text-sm text-green-400">
                Generated <strong>{lastResult.generated}</strong> reviews for{" "}
                <strong>{lastResult.productName}</strong>. Total now:{" "}
                <strong>{lastResult.totalReviews}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Click a row to select a product for review generation</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className={`cursor-pointer transition-colors ${
                      selectedProductId === product.id
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.image}
                            alt={product.name}
                            className="size-8 object-cover"
                          />
                        </div>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={categoryColor(product.category)}>
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="size-3.5 fill-yellow-500 text-yellow-500" />
                        <span>{product.reviewCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={selectedProductId === product.id ? "default" : "ghost"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductId(product.id);
                        }}
                      >
                        {selectedProductId === product.id ? "Selected" : "Select"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

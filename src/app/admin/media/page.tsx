"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Grid,
  List,
  Copy,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaItem {
  id: string;
  url: string;
  alt: string;
  source: "product_gallery" | "product_primary" | "content";
  productName: string | null;
  productId: string | null;
  createdAt: string;
}

type FilterType = "all" | "product" | "content";
type ViewType = "grid" | "list";

const SOURCE_LABELS: Record<MediaItem["source"], string> = {
  product_gallery: "Product Gallery",
  product_primary: "Product Primary",
  content: "Content",
};

const SOURCE_COLORS: Record<MediaItem["source"], string> = {
  product_gallery: "default",
  product_primary: "secondary",
  content: "outline",
};

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<ViewType>("grid");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  useEffect(() => { fetchMedia(); }, []);

  async function fetchMedia() {
    try {
      const res = await fetch("/api/admin/media", { credentials: "include", headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Failed to fetch media");
      const json = await res.json();
      setMedia(json.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load media library");
    } finally { setLoading(false); }
  }

  const filteredMedia = useMemo(() => {
    let items = media;
    if (filter === "product") items = items.filter((m) => m.source === "product_gallery" || m.source === "product_primary");
    else if (filter === "content") items = items.filter((m) => m.source === "content");
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((m) => m.alt.toLowerCase().includes(q) || m.url.toLowerCase().includes(q) || (m.productName && m.productName.toLowerCase().includes(q)));
    }
    return items;
  }, [media, filter, search]);

  function copyUrl(url: string) { navigator.clipboard.writeText(url); toast.success("URL copied to clipboard"); }
  function handleImageError(id: string) { setBrokenImages((prev) => new Set(prev).add(id)); }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-10 w-32" /></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (<Skeleton key={i} className="aspect-square rounded-lg" />))}
        </div>
      </div>
    );
  }

  const totalLabel = (filter !== "all" || search) ? " (" + media.length + " total)" : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            {filteredMedia.length} image{filteredMedia.length !== 1 ? "s" : ""}{totalLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "product" ? "default" : "outline"} size="sm" onClick={() => setFilter("product")}><ImageIcon className="size-4 mr-1" />Product Images</Button>
          <Button variant={filter === "content" ? "default" : "outline"} size="sm" onClick={() => setFilter("content")}>Content Images</Button>
        </div>
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search by name, URL, or product..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            {search && (<button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>)}
          </div>
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button variant={view === "grid" ? "default" : "ghost"} size="sm" onClick={() => setView("grid")} className="h-8 w-8 p-0"><Grid className="size-4" /></Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")} className="h-8 w-8 p-0"><List className="size-4" /></Button>
          </div>
        </div>
      </div>

      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ImageIcon className="size-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No images found</p>
            <p className="text-sm">{search ? "Try a different search term" : "Upload images via product management or content blocks"}</p>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia.map((item) => (
            <div key={item.id} className="group cursor-pointer" onClick={() => setSelectedItem(item)}>
              <div className="aspect-square relative overflow-hidden rounded-lg border border-border bg-muted">
                {brokenImages.has(item.id) ? (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="size-8 text-muted-foreground opacity-50" /></div>
                ) : (
                  <img src={item.url} alt={item.alt} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={() => handleImageError(item.id)} />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <Badge variant={SOURCE_COLORS[item.source] as "default" | "secondary" | "outline"} className="w-fit mb-1.5 text-xs">{SOURCE_LABELS[item.source]}</Badge>
                  {item.productName && <p className="text-xs text-white truncate">{item.productName}</p>}
                  <div className="flex items-center gap-1 mt-1.5">
                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); copyUrl(item.url); }}><Copy className="size-3 mr-1" />Copy URL</Button>
                  </div>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground truncate">{item.alt}</p>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Preview</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedia.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <TableCell>
                    <div className="size-10 rounded border border-border bg-muted overflow-hidden">
                      {brokenImages.has(item.id) ? (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon className="size-4 text-muted-foreground opacity-50" /></div>
                      ) : (
                        <img src={item.url} alt={item.alt} className="w-full h-full object-cover" onError={() => handleImageError(item.id)} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell><p className="text-sm truncate max-w-[300px]">{item.url}</p></TableCell>
                  <TableCell><Badge variant={SOURCE_COLORS[item.source] as "default" | "secondary" | "outline"} className="text-xs">{SOURCE_LABELS[item.source]}</Badge></TableCell>
                  <TableCell><span className="text-sm">{item.productName || "-"}</span></TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); copyUrl(item.url); }}><Copy className="size-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); window.open(item.url, "_blank"); }}><ExternalLink className="size-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Image Details</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="relative w-full max-h-[400px] overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center">
                {brokenImages.has(selectedItem.id) ? (
                  <div className="py-16 flex flex-col items-center text-muted-foreground"><ImageIcon className="size-12 mb-2 opacity-50" /><p className="text-sm">Image not available</p></div>
                ) : (
                  <img src={selectedItem.url} alt={selectedItem.alt} className="max-w-full max-h-[400px] object-contain" onError={() => handleImageError(selectedItem.id)} />
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">URL</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm bg-muted px-3 py-1.5 rounded break-all">{selectedItem.url}</code>
                    <Button size="sm" variant="outline" onClick={() => copyUrl(selectedItem.url)}><Copy className="size-3.5 mr-1" />Copy</Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(selectedItem.url, "_blank")}><ExternalLink className="size-3.5" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Source</p>
                    <Badge variant={SOURCE_COLORS[selectedItem.source] as "default" | "secondary" | "outline"} className="mt-1">{SOURCE_LABELS[selectedItem.source]}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Alt Text</p>
                    <p className="text-sm mt-1">{selectedItem.alt || "-"}</p>
                  </div>
                  {selectedItem.productName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Product</p>
                      <p className="text-sm mt-1">{selectedItem.productName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="text-sm mt-1">{new Date(selectedItem.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

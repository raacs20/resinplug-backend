"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Search, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface OrderItemRow {
  id: string;
  productId?: string;
  productName: string;
  weight: string;
  unitPrice: number;
  quantity: number;
  image?: string;
}

interface ProductResult {
  id: string;
  name: string;
  slug: string;
  image: string;
  salePrice: number;
  category: string;
  variants: { weight: string; price: number }[];
}

export default function NewOrderPage() {
  const router = useRouter();
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [notes, setNotes] = useState("");
  const [applyShipping, setApplyShipping] = useState(true);
  const [showAddress, setShowAddress] = useState(false);
  const [address, setAddress] = useState({
    firstName: "", lastName: "", address: "", city: "", province: "", postalCode: "", country: "Canada", phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [emailLookupDone, setEmailLookupDone] = useState(false);

  const lookupCustomer = useCallback(async (email: string) => {
    if (!email || !email.includes("@")) return;
    try {
      const res = await fetch("/api/admin/customers?email=" + encodeURIComponent(email) + "&limit=1", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const customers = json.data || [];
        if (customers.length > 0 && customers[0].name && !customerName) {
          setCustomerName(customers[0].name);
          toast.info("Found existing customer: " + customers[0].name);
        }
      }
    } catch {}
    setEmailLookupDone(true);
  }, [customerName]);

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) { setProductResults([]); return; }
    setSearchingProducts(true);
    try {
      const res = await fetch("/api/admin/products?search=" + encodeURIComponent(query) + "&limit=10", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const products = (json.data || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          slug: p.slug as string,
          image: p.image as string,
          salePrice: typeof p.salePrice === "string" ? parseFloat((p.salePrice as string).replace("$", "")) : Number(p.salePrice),
          category: p.category as string,
          variants: ((p.variants as Record<string, unknown>[]) || []).map((v) => ({ weight: v.weight as string, price: typeof v.price === "string" ? parseFloat((v.price as string).replace("$", "")) : Number(v.price) })),
        }));
        setProductResults(products);
      }
    } catch { toast.error("Failed to search products"); }
    setSearchingProducts(false);
  }, []);

  function addProduct(product: ProductResult) {
    const defaultVariant = product.variants[0];
    const newItem: OrderItemRow = {
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      weight: defaultVariant?.weight || "1g",
      unitPrice: defaultVariant?.price || product.salePrice,
      quantity: 1,
      image: product.image,
    };
    setItems((prev) => [...prev, newItem]);
    setProductSearch("");
    setProductResults([]);
  }

  function addManualItem() {
    setItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      productName: "",
      weight: "1g",
      unitPrice: 0,
      quantity: 1,
    }]);
  }

  function updateItem(id: string, field: keyof OrderItemRow, value: string | number) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = applyShipping ? 9.99 : 0;
  const total = subtotal + shipping;

  async function handleSubmit() {
    if (!customerEmail || !customerName) { toast.error("Customer email and name are required"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    const invalidItems = items.filter((i) => !i.productName || i.unitPrice <= 0 || i.quantity <= 0);
    if (invalidItems.length > 0) { toast.error("All items must have a name, price, and quantity"); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        customerEmail,
        customerName,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          weight: i.weight,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          image: i.image,
        })),
        notes,
        applyShipping,
      };
      if (showAddress) payload.shippingAddress = address;

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to create order");
      }

      const json = await res.json();
      toast.success("Order " + json.data.orderNumber + " created successfully");
      router.push("/admin/orders");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders"><ArrowLeft className="size-4 mr-1" />Back to Orders</Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Order</h1>
        <p className="text-sm text-muted-foreground">Manually create an order for phone or in-person sales</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Customer Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="customer@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} onBlur={(e) => lookupCustomer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="John Doe" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addManualItem}><Plus className="size-4 mr-1" />Add Manual Item</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search Products</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search by product name..." value={productSearch} onChange={(e) => { setProductSearch(e.target.value); searchProducts(e.target.value); }} className="pl-9" />
            </div>
            {productResults.length > 0 && (
              <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                {productResults.map((product) => (
                  <button key={product.id} type="button" className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left" onClick={() => addProduct(product)}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="size-10 rounded object-cover" />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center"><Package className="size-5 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category} &middot; ${product.salePrice.toFixed(2)}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Add</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && <Separator />}

          {items.map((item, idx) => (
            <div key={item.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Product Name *</Label>
                <Input value={item.productName} onChange={(e) => updateItem(item.id, "productName", e.target.value)} placeholder="Product name" />
              </div>
              <div className="w-24 space-y-2">
                <Label className="text-xs">Weight</Label>
                <Input value={item.weight} onChange={(e) => updateItem(item.id, "weight", e.target.value)} placeholder="1g" />
              </div>
              <div className="w-28 space-y-2">
                <Label className="text-xs">Unit Price *</Label>
                <Input type="number" step="0.01" min="0" value={item.unitPrice || ""} onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)} placeholder="0.00" />
              </div>
              <div className="w-20 space-y-2">
                <Label className="text-xs">Qty *</Label>
                <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} />
              </div>
              <div className="w-24 space-y-2 text-right">
                <Label className="text-xs">Line Total</Label>
                <p className="text-sm font-medium pt-2">${(item.unitPrice * item.quantity).toFixed(2)}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => removeItem(item.id)}><Trash2 className="size-4" /></Button>
            </div>
          ))}

          {items.length > 0 && (
            <div className="flex justify-end">
              <p className="text-sm font-medium">Subtotal: <span className="text-base">${subtotal.toFixed(2)}</span></p>
            </div>
          )}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package className="size-10 mb-2 opacity-50" />
              <p className="text-sm">No items added yet. Search for products above or add a manual item.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <Collapsible open={showAddress} onOpenChange={setShowAddress}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle>Shipping Address</CardTitle>
                <Badge variant="outline">{showAddress ? "Collapse" : "Expand"}</Badge>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input value={address.firstName} onChange={(e) => setAddress({ ...address, firstName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={address.lastName} onChange={(e) => setAddress({ ...address, lastName: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>City</Label><Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Province</Label><Input value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })} /></div>
                <div className="space-y-2"><Label>Postal Code</Label><Input value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Country</Label><Input value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} /></div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm items-center">
              <div className="flex items-center gap-2"><span>Shipping</span><Switch checked={applyShipping} onCheckedChange={setApplyShipping} /><span className="text-xs text-muted-foreground">{applyShipping ? "$9.99" : "Free"}</span></div>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Internal notes about this order..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" size="lg" disabled={submitting || items.length === 0 || !customerEmail || !customerName}>
                {submitting ? "Creating Order..." : "Create Order"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Order Creation</AlertDialogTitle>
                <AlertDialogDescription>
                  Create a manual order for {customerName} ({customerEmail}) with {items.length} item{items.length !== 1 ? "s" : ""} totalling ${total.toFixed(2)}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Create Order</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

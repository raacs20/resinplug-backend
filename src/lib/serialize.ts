import { Decimal } from "@prisma/client/runtime/library";

/**
 * Recursively converts Prisma Decimal fields to number for JSON serialization.
 * Prisma returns Decimal objects which don't auto-serialize to numbers.
 */
export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Decimal) return obj.toNumber() as unknown as T;
  // Fallback: check for Decimal-like objects with toNumber method
  if (typeof obj === "object" && "toNumber" in (obj as object) && typeof (obj as Record<string, unknown>).toNumber === "function") {
    return (obj as unknown as { toNumber: () => number }).toNumber() as unknown as T;
  }
  if (obj instanceof Date) return obj.toISOString() as unknown as T;
  if (Array.isArray(obj)) return obj.map(serializeDecimals) as unknown as T;
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeDecimals(value);
    }
    return result as T;
  }
  return obj;
}

/**
 * Flattens a Prisma review (with nested product) into the shape the frontend expects.
 */
export function formatReview(review: Record<string, unknown>) {
  const product = review.product as Record<string, unknown> | undefined;
  const { product: _product, ...rest } = review;
  return {
    ...rest,
    productName: product?.name ?? "",
    productImage: normalizeImagePath(product?.image),
    productCategory: product?.category ?? "",
  };
}

/**
 * Normalize image paths to .webp.
 * All strain images were converted from PNG to WebP — this ensures
 * any legacy .png paths in the database are served correctly.
 */
function normalizeImagePath(imagePath: unknown): string {
  if (typeof imagePath !== "string" || !imagePath) return "";
  // Convert /strains/xxx.png → /strains/xxx.webp
  if (imagePath.startsWith("/strains/") && imagePath.endsWith(".png")) {
    return imagePath.replace(/\.png$/, ".webp");
  }
  return imagePath;
}

/**
 * Formats a product from Prisma into the shape the frontend expects.
 * Converts Decimal prices to "$X.XX" strings and normalizes image paths.
 */
export function formatProduct(product: Record<string, unknown>) {
  const variants = (product.variants as Record<string, unknown>[]) || [];
  return {
    ...product,
    image: normalizeImagePath(product.image),
    salePrice: `$${Number(product.salePrice).toFixed(2)}`,
    originalPrice: `$${Number(product.originalPrice).toFixed(2)}`,
    variants: variants.map((v) => ({
      weight: v.weight,
      price: `$${Number(v.price).toFixed(2)}`,
      ...(v.originalPrice != null
        ? { originalPrice: `$${Number(v.originalPrice).toFixed(2)}` }
        : {}),
      ...(v.discount ? { discount: v.discount } : {}),
    })),
  };
}

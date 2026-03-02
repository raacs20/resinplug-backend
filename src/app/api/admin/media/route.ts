import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // Get all product images
    const productImages = await prisma.productImage.findMany({
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Get content block images
    const contentImages = await prisma.contentBlock.findMany({
      where: { type: "image" },
      orderBy: { updatedAt: "desc" },
    });

    // Get product primary images (the `image` field on Product)
    const products = await prisma.product.findMany({
      where: { image: { not: "" } },
      select: { id: true, name: true, slug: true, image: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    // Combine into unified format
    const media = [
      ...productImages.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt || img.product?.name || "",
        source: "product_gallery" as const,
        productName: img.product?.name || null,
        productId: img.productId,
        createdAt: img.createdAt.toISOString(),
      })),
      ...products.map((p) => ({
        id: `product-${p.id}`,
        url: p.image,
        alt: p.name,
        source: "product_primary" as const,
        productName: p.name,
        productId: p.id,
        createdAt: p.createdAt.toISOString(),
      })),
      ...contentImages.map((cb) => ({
        id: cb.id,
        url: cb.value,
        alt: cb.label || cb.key,
        source: "content" as const,
        productName: null,
        productId: null,
        createdAt: cb.createdAt.toISOString(),
      })),
    ];

    // Sort by newest first
    media.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return success(media);
  } catch (err) {
    console.error("Media library error:", err);
    return serverError("Failed to fetch media");
  }
}

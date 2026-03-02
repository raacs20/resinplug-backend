import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { serializeDecimals } from "@/lib/serialize";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    // Get original product with variants
    const original = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!original) return serverError("Product not found");

    // Generate unique slug
    let slug = `${original.slug}-copy`;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${original.slug}-copy-${counter++}`;
    }

    // Clone product
    const cloned = await prisma.product.create({
      data: {
        name: `${original.name} (Copy)`,
        slug,
        description: original.description,
        shortDesc: original.shortDesc,
        salePrice: original.salePrice,
        originalPrice: original.originalPrice,
        image: original.image,
        category: original.category,
        thc: original.thc,
        isActive: false, // Start as inactive
        featured: false,
        popularity: 0,
        totalStockGrams: original.totalStockGrams,
        stockUnit: original.stockUnit,
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        metaKeywords: original.metaKeywords,
        variants: {
          create: original.variants.map(v => ({
            weight: v.weight,
            price: v.price,
            originalPrice: v.originalPrice,
            discount: v.discount,
            sku: v.sku ? `${v.sku}-COPY` : null,
            gramsPerUnit: v.gramsPerUnit,
            stockOverride: v.stockOverride,
          })),
        },
      },
    });

    const adminId = (session!.user as any).id;
    await logActivity(adminId, "product.clone", "product", cloned.id, `Cloned from ${original.name}`).catch(() => {});

    return success(serializeDecimals(cloned));
  } catch (err) {
    console.error("Clone error:", err);
    return serverError("Failed to clone product");
  }
}

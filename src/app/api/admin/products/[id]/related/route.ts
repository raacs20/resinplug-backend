import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";

// GET - get related products for a product
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { relatedProductIds: true },
    });

    if (!product) return badRequest("Product not found");

    // Fetch the actual related product details
    const relatedProducts =
      product.relatedProductIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: product.relatedProductIds } },
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
              category: true,
              salePrice: true,
            },
          })
        : [];

    return success(
      relatedProducts.map((p) => ({
        ...p,
        salePrice: p.salePrice.toNumber(),
      }))
    );
  } catch (err) {
    return serverError("Failed to fetch related products");
  }
}

// PUT - update related products
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const { relatedProductIds } = await req.json();

    if (!Array.isArray(relatedProductIds))
      return badRequest("relatedProductIds must be an array");

    // Filter out self-reference
    const filtered = relatedProductIds.filter((pid: string) => pid !== id);

    await prisma.product.update({
      where: { id },
      data: { relatedProductIds: filtered },
    });

    const adminId = (session!.user as any).id;
    await logActivity(
      adminId,
      "product.related.update",
      "product",
      id,
      `Set ${filtered.length} related products`
    ).catch(() => {});

    return success({ relatedProductIds: filtered });
  } catch (err) {
    return serverError("Failed to update related products");
  }
}

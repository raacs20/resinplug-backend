import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

// Allowed fields for product update
const ALLOWED_FIELDS = new Set([
  "name",
  "slug",
  "salePrice",
  "originalPrice",
  "image",
  "category",
  "thc",
  "popularity",
  "featured",
  "isActive",
  "description",
  "shortDesc",
  "sku",
  "totalStockGrams",
  "stockUnit",
  "reorderPoint",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!product) {
      return notFound("Product not found");
    }

    return success(serializeDecimals(product));
  } catch (err) {
    console.error("Admin product get error:", err);
    return serverError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    // Verify the product exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Product not found");
    }

    // Filter to only allowed fields
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No valid fields provided for update");
    }

    // Validate category if provided
    if (data.category) {
      const validCategories = ["Indica", "Hybrid", "Sativa"];
      if (!validCategories.includes(data.category as string)) {
        return badRequest(
          `Invalid category. Must be one of: ${validCategories.join(", ")}`
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
      },
    });

    await logActivity(session!.user!.id, "product.update", "product", id, `Updated ${Object.keys(data).join(", ")}`);

    return success(serializeDecimals(product));
  } catch (err) {
    console.error("Admin product update error:", err);
    return serverError();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return notFound("Product not found");

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity(session!.user!.id, "product.deactivate", "product", id);

    return success({ deactivated: true });
  } catch (err) {
    console.error("Admin product delete error:", err);
    return serverError();
  }
}

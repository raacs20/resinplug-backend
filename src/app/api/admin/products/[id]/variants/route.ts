import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return notFound("Product not found");
    }

    const variants = await prisma.variant.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });

    return success(serializeDecimals(variants));
  } catch (err) {
    console.error("Admin variants list error:", err);
    return serverError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      weight,
      price,
      originalPrice,
      discount,
      sku,
      gramsPerUnit,
      sortOrder,
      isActive,
    } = body;

    if (!weight || price === undefined || price === null) {
      return badRequest("Missing required fields: weight, price");
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return notFound("Product not found");
    }

    const variant = await prisma.variant.create({
      data: {
        productId: id,
        weight,
        price,
        originalPrice: originalPrice ?? null,
        discount: discount ?? null,
        sku: sku ?? null,
        gramsPerUnit: gramsPerUnit ?? null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    await logActivity(session!.user!.id, "variant.create", "product", id, `Added variant ${variant.weight}`);

    return success(serializeDecimals(variant), { status: 201 });
  } catch (err) {
    console.error("Admin variant create error:", err);
    return serverError();
  }
}

const VARIANT_ALLOWED_FIELDS = new Set([
  "weight",
  "price",
  "originalPrice",
  "discount",
  "sku",
  "gramsPerUnit",
  "sortOrder",
  "isActive",
  "stockOverride",
]);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { variantId, ...fields } = body;

    if (!variantId) {
      return badRequest("variantId is required");
    }

    // Verify the product exists
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return notFound("Product not found");
    }

    // Filter to only allowed fields
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (VARIANT_ALLOWED_FIELDS.has(key)) {
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No valid fields provided for update");
    }

    // Verify variant belongs to this product
    const existingVariant = await prisma.variant.findFirst({
      where: { id: variantId, productId: id },
    });
    if (!existingVariant) {
      return notFound("Variant not found for this product");
    }

    const variant = await prisma.variant.update({
      where: { id: variantId },
      data,
    });

    await logActivity(session!.user!.id, "variant.update", "product", id, `Updated variant ${variantId}: ${Object.keys(data).join(", ")}`);

    return success(serializeDecimals(variant));
  } catch (err) {
    console.error("Admin variant update error:", err);
    return serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { variantId } = body;

    if (!variantId) {
      return badRequest("variantId is required");
    }

    // Verify the product exists
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return notFound("Product not found");
    }

    // Verify variant belongs to this product
    const existingVariant = await prisma.variant.findFirst({
      where: { id: variantId, productId: id },
    });
    if (!existingVariant) {
      return notFound("Variant not found for this product");
    }

    await prisma.variant.delete({ where: { id: variantId } });

    await logActivity(session!.user!.id, "variant.delete", "product", id, `Deleted variant ${variantId}`);

    return success({ deleted: true });
  } catch (err) {
    console.error("Admin variant delete error:", err);
    return serverError();
  }
}

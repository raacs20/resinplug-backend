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

    const images = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });

    return success(serializeDecimals(images));
  } catch (err) {
    console.error("Admin images list error:", err);
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
    const { url, alt, isPrimary } = body;

    if (!url) {
      return badRequest("Missing required field: url");
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return notFound("Product not found");
    }

    // If isPrimary is true, unset all other primary images for this product
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.productImage.create({
      data: {
        productId: id,
        url,
        alt: alt ?? null,
        isPrimary: isPrimary ?? false,
      },
    });

    await logActivity(session!.user!.id, "image.add", "product", id, `Added image ${image.id}`);

    return success(serializeDecimals(image), { status: 201 });
  } catch (err) {
    console.error("Admin image create error:", err);
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
    const { imageId } = body;

    if (!imageId) {
      return badRequest("imageId is required");
    }

    // Verify the product exists
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return notFound("Product not found");
    }

    // Verify the image belongs to this product
    const existingImage = await prisma.productImage.findFirst({
      where: { id: imageId, productId: id },
    });
    if (!existingImage) {
      return notFound("Image not found for this product");
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    await logActivity(session!.user!.id, "image.remove", "product", id, `Removed image ${imageId}`);

    return success({ deleted: true });
  } catch (err) {
    console.error("Admin image delete error:", err);
    return serverError();
  }
}

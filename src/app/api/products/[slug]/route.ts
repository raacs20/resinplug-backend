import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, notFound, badRequest, serverError } from "@/lib/api-response";
import { formatProduct } from "@/lib/serialize";
import { z } from "zod";
import { Category, Prisma } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  salePrice: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  image: z.string().min(1).optional(),
  category: z.nativeEnum(Category).optional(),
  thc: z.string().min(1).optional(),
  popularity: z.number().int().min(0).max(10).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        weight: z.string().min(1),
        price: z.number().positive(),
        originalPrice: z.number().positive().optional(),
        discount: z.string().optional(),
        sortOrder: z.number().int().optional().default(0),
      })
    )
    .optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    // Only return active products on the public endpoint
    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });

    if (!product) return notFound("Product not found");

    return success(formatProduct(product as unknown as Record<string, unknown>));
  } catch (err) {
    console.error("GET /api/products/[slug] error:", err);
    return serverError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { variants, ...productData } = parsed.data;

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing) return notFound("Product not found");

    const product = await prisma.product.update({
      where: { slug },
      data: {
        ...productData,
        ...(variants
          ? {
              variants: {
                deleteMany: {},
                create: variants,
              },
            }
          : {}),
      },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });

    return success(formatProduct(product as unknown as Record<string, unknown>));
  } catch (err) {
    console.error("PATCH /api/products/[slug] error:", err);
    return serverError();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { slug } = await params;
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing) return notFound("Product not found");

    // Soft delete
    await prisma.product.update({
      where: { slug },
      data: { isActive: false },
    });

    return success({ message: "Product deactivated" });
  } catch (err) {
    console.error("DELETE /api/products/[slug] error:", err);
    return serverError();
  }
}

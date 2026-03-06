import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { generateReviewsForSingleProduct } from "../../../../../prisma/seed-reviews";

/**
 * GET /api/admin/review-generator
 * Returns all products with their current review counts for the generator UI.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        image: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { name: "asc" },
    });

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      image: p.image,
      reviewCount: p._count.reviews,
    }));

    return success(data);
  } catch (err) {
    console.error("Review generator list error:", err);
    return serverError();
  }
}

/**
 * POST /api/admin/review-generator
 * Generates and inserts reviews for a specific product.
 * Body: { productId: string, count: number }
 */
export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { productId, count } = body;

    if (!productId || typeof productId !== "string") {
      return badRequest("productId is required");
    }

    const numReviews = Math.min(Math.max(parseInt(count, 10) || 10, 1), 200);

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, slug: true },
    });

    if (!product) {
      return badRequest("Product not found");
    }

    // Generate reviews
    const reviews = generateReviewsForSingleProduct(
      product.id,
      product.name,
      numReviews,
    );

    // Batch insert
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
      const batch = reviews.slice(i, i + BATCH_SIZE);
      const result = await prisma.review.createMany({ data: batch });
      inserted += result.count;
    }

    // Log activity
    await logActivity(
      session!.user!.id!,
      "review.generate",
      "review",
      product.id,
      `Generated ${inserted} reviews for ${product.name}`,
    );

    // Get updated count
    const totalCount = await prisma.review.count({
      where: { productId: product.id },
    });

    return success({
      generated: inserted,
      productName: product.name,
      totalReviews: totalCount,
    });
  } catch (err) {
    console.error("Review generator error:", err);
    return serverError();
  }
}

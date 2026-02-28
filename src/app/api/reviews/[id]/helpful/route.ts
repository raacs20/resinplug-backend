import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals, formatReview } from "@/lib/serialize";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify review exists
    const existing = await prisma.review.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) return notFound("Review not found");

    // Increment helpfulCount by 1
    const review = await prisma.review.update({
      where: { id },
      data: {
        helpfulCount: { increment: 1 },
      },
      include: {
        product: {
          select: {
            name: true,
            slug: true,
            image: true,
            category: true,
          },
        },
      },
    });

    return success(formatReview(serializeDecimals(review) as Record<string, unknown>));
  } catch (err) {
    console.error("PATCH /api/reviews/[id]/helpful error:", err);
    return serverError();
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals, formatReview } from "@/lib/serialize";
import { reviewVoteLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate limit: 1 vote per review per IP per hour (Redis-backed)
    const ip = getClientIp(request);
    const { limited } = await checkRateLimit(reviewVoteLimiter, `${id}:${ip}`);
    if (limited) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "You already voted on this review" } },
        { status: 429 }
      );
    }

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

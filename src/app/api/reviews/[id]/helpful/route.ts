import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals, formatReview } from "@/lib/serialize";

/* ── IP-based rate limiter: 1 vote per review per IP per hour ── */
const voteMap = new Map<string, number>();
const VOTE_COOLDOWN = 60 * 60 * 1000; // 1 hour

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of voteMap) {
    if (now - timestamp > VOTE_COOLDOWN) voteMap.delete(key);
  }
}, 10 * 60 * 1000);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate limit: 1 vote per review per IP per hour
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateKey = `${id}:${ip}`;
    const lastVote = voteMap.get(rateKey);
    if (lastVote && Date.now() - lastVote < VOTE_COOLDOWN) {
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

    // Record the vote
    voteMap.set(rateKey, Date.now());

    return success(formatReview(serializeDecimals(review) as Record<string, unknown>));
  } catch (err) {
    console.error("PATCH /api/reviews/[id]/helpful error:", err);
    return serverError();
  }
}

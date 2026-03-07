import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { serializeDecimals, formatReview } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    // Filters
    const ratingParam = searchParams.get("rating");
    const verifiedParam = searchParams.get("verified");
    const sort = searchParams.get("sort") || "recent";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (ratingParam) {
      const rating = parseInt(ratingParam, 10);
      if (rating < 1 || rating > 5) {
        return badRequest("Rating must be between 1 and 5");
      }
      where.rating = rating;
    }

    if (verifiedParam === "true") {
      where.verified = true;
    } else if (verifiedParam === "false") {
      where.verified = false;
    }

    // Build orderBy
    let orderBy: Record<string, string>;
    switch (sort) {
      case "helpful":
        orderBy = { helpfulCount: "desc" };
        break;
      case "rating":
        orderBy = { rating: "desc" };
        break;
      case "rating_asc":
        orderBy = { rating: "asc" };
        break;
      case "recent":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // Execute query with count + distribution
    const [reviews, total, dist] = await Promise.all([
      prisma.review.findMany({
        where,
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ["rating"],
        _count: { rating: true },
      }),
    ]);

    // Build distribution map { 5: count, 4: count, ... }
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const d of dist) {
      distribution[d.rating] = d._count.rating;
    }

    const formatted = reviews.map((r) => formatReview(serializeDecimals(r) as Record<string, unknown>));

    return success(formatted, {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        distribution,
      },
    });
  } catch (err) {
    console.error("GET /api/reviews error:", err);
    return serverError();
  }
}

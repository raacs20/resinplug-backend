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

    if (verifiedParam !== null && verifiedParam !== undefined) {
      where.verified = verifiedParam === "true";
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
      case "recent":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // Execute query with count
    const [reviews, total] = await Promise.all([
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
    ]);

    const formatted = reviews.map((r) => formatReview(serializeDecimals(r) as Record<string, unknown>));

    return success(formatted, {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET /api/reviews error:", err);
    return serverError();
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  success,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api-response";
import { serializeDecimals, formatReview } from "@/lib/serialize";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const createReviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional(),
  text: z.string().min(1).max(5000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) return notFound("Product not found");

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
    const where: Record<string, unknown> = { productId: product.id };

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
    console.error("GET /api/products/[slug]/reviews error:", err);
    return serverError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Auth required
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const { slug } = await params;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!product) return notFound("Product not found");

    // Validate body
    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    // Verify the order-item belongs to this user, matches the product, and hasn't been reviewed
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: parsed.data.orderItemId },
      include: {
        order: { select: { userId: true, status: true } },
        review: { select: { id: true } },
      },
    });

    if (!orderItem || orderItem.order.userId !== session.user.id) {
      return badRequest("Invalid order item");
    }
    if (orderItem.order.status === "cancelled") {
      return badRequest("Cannot review items from cancelled orders");
    }
    if (orderItem.productId !== product.id) {
      return badRequest("Order item does not match this product");
    }
    if (orderItem.review) {
      return badRequest("You have already reviewed this purchase");
    }

    // Get user info for customerName
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const customerName =
      user?.name || user?.email?.split("@")[0] || "Anonymous";

    // Create the review (always verified — purchase is proven)
    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: session.user.id,
        orderItemId: parsed.data.orderItemId,
        customerName,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        text: parsed.data.text,
        verified: true,
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

    // Award 100 reward points ($1 credit) — fire-and-forget
    prisma
      .$transaction(async (tx) => {
        await tx.credit.create({
          data: {
            userId: session.user.id,
            amount: 100,
            type: "earned",
            reason: `Review reward — ${product.name}`,
          },
        });
        await tx.user.update({
          where: { id: session.user.id },
          data: { creditBalance: { increment: 100 } },
        });
      })
      .catch((e) => console.error("Review reward error:", e));

    // Fire-and-forget notification for admin
    createNotification(
      "new_review",
      "New Review",
      `${review.customerName} left a ${review.rating}-star review`,
      `/admin/reviews`
    ).catch((e) => console.error("Notification error:", e));

    return success(formatReview(serializeDecimals(review) as Record<string, unknown>), { status: 201 });
  } catch (err) {
    console.error("POST /api/products/[slug]/reviews error:", err);
    return serverError();
  }
}

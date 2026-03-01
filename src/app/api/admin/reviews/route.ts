import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const verified = searchParams.get("verified"); // "true" | "false" | null

    const where: Prisma.ReviewWhereInput = {};

    if (verified === "true") {
      where.verified = true;
    } else if (verified === "false") {
      where.verified = false;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, slug: true, image: true, category: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return success(serializeDecimals(reviews), {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin reviews list error:", err);
    return serverError();
  }
}

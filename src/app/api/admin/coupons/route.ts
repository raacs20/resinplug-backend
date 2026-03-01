import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count(),
    ]);

    return success(serializeDecimals(coupons), {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin coupons list error:", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { code, discountType, discountValue, minOrder, maxUses, isActive, expiresAt } = body;

    if (!code || !discountType || discountValue == null) {
      return badRequest("Missing required fields: code, discountType, discountValue");
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      return badRequest("discountType must be 'percentage' or 'fixed'");
    }

    if (discountType === "percentage" && (discountValue < 0 || discountValue > 100)) {
      return badRequest("Percentage discount must be between 0 and 100");
    }

    // Check uniqueness
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return badRequest("Coupon code already exists");
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        minOrder: minOrder || null,
        maxUses: maxUses || null,
        isActive: isActive ?? true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return success(serializeDecimals(coupon), { status: 201 });
  } catch (err) {
    console.error("Admin coupon create error:", err);
    return serverError();
  }
}

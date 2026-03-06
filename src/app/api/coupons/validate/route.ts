import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { couponValidateLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const couponValidateSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  subtotal: z.number().positive("subtotal must be a positive number"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per IP per minute
    const { limited } = await checkRateLimit(couponValidateLimiter, getClientIp(request));
    if (limited) {
      return badRequest("Too many coupon attempts. Please try again later.");
    }
    const body = await request.json();
    const parsed = couponValidateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { code, subtotal } = parsed.data;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return notFound("Invalid coupon code");
    }

    if (!coupon.isActive) {
      return badRequest("This coupon is no longer active");
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return badRequest("This coupon has expired");
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return badRequest("This coupon has reached its usage limit");
    }

    if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
      return badRequest(`Minimum order of $${Number(coupon.minOrder).toFixed(2)} required for this coupon`);
    }

    // Calculate discount (round immediately to avoid floating-point drift)
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = Math.round((subtotal * Number(coupon.discountValue) / 100) * 100) / 100;
    } else {
      discount = Math.round(Number(coupon.discountValue) * 100) / 100;
    }

    return success(
      serializeDecimals({
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: Math.round(discount * 100) / 100,
        minOrder: coupon.minOrder,
      })
    );
  } catch (err) {
    console.error("Coupon validation error:", err);
    return serverError();
  }
}

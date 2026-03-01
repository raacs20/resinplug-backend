import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code) {
      return badRequest("Coupon code is required");
    }

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

    if (coupon.minOrder && subtotal && Number(subtotal) < Number(coupon.minOrder)) {
      return badRequest(`Minimum order of $${Number(coupon.minOrder).toFixed(2)} required for this coupon`);
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = subtotal ? (Number(subtotal) * Number(coupon.discountValue)) / 100 : 0;
    } else {
      discount = Number(coupon.discountValue);
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

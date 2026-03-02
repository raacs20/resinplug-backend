import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";

const shippingCalcSchema = z.object({
  subtotal: z.number().positive("subtotal must be a positive number"),
  postalCode: z.string().optional(),
});

const DEFAULT_FREE_SHIPPING_THRESHOLD = 200;
const DEFAULT_FLAT_RATE = 9.99;
const DEFAULT_EXPRESS_RATE = 19.99;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = shippingCalcSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { subtotal, postalCode } = parsed.data;

    // Check if there's a custom threshold in site settings
    let freeThreshold = DEFAULT_FREE_SHIPPING_THRESHOLD;
    try {
      const setting = await prisma.siteSetting.findUnique({
        where: { key: "freeShippingThreshold" },
      });
      if (setting) freeThreshold = Number(setting.value);
    } catch {
      // Use default
    }

    const isFreeShipping = subtotal >= freeThreshold;

    const options = [
      {
        id: "standard",
        name: "Standard Shipping",
        price: isFreeShipping ? 0 : DEFAULT_FLAT_RATE,
        estimatedDays: "5-7 business days",
        isFree: isFreeShipping,
      },
      {
        id: "express",
        name: "Express Shipping",
        price: isFreeShipping ? 0 : DEFAULT_EXPRESS_RATE,
        estimatedDays: "2-3 business days",
        isFree: isFreeShipping,
      },
    ];

    return success({
      freeShippingThreshold: freeThreshold,
      subtotal,
      postalCode: postalCode ?? null,
      options,
      recommended: options[0],
    });
  } catch (err) {
    console.error("Shipping calculation error:", err);
    return serverError();
  }
}

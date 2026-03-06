import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";
import { registerLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

const setPasswordSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  orderNumber: z.string().min(1, "Order number is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit using the register limiter (3 per hour per IP)
    const { limited } = await checkRateLimit(registerLimiter, getClientIp(request));
    if (limited) {
      return badRequest("Too many attempts. Try again later.");
    }

    const body = await request.json();
    const parsed = setPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { email, password, orderNumber } = parsed.data;

    // Verify: user exists and needs password setup
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, needsPasswordSetup: true },
    });

    if (!user || !user.needsPasswordSetup) {
      return badRequest("Invalid request. Account may already be set up.");
    }

    // Verify: order with that email exists (proof of purchase identity)
    const order = await prisma.order.findFirst({
      where: { orderNumber, email: { equals: email, mode: "insensitive" } },
    });

    if (!order) {
      return badRequest("Order not found for this email.");
    }

    // Set password and clear the flag
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword, needsPasswordSetup: false },
    });

    return success({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error("POST /api/auth/set-password error:", err);
    return serverError();
  }
}

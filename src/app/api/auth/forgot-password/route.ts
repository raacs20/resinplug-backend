import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { forgotPasswordLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, getEmailContentWithDefaults } from "@/lib/email";
import { createElement } from "react";
import PasswordReset from "@/emails/PasswordReset";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().email().max(255),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 requests per IP per hour
    const { limited } = await checkRateLimit(forgotPasswordLimiter, getClientIp(request));
    if (limited) {
      return badRequest("Too many reset requests. Try again later.");
    }

    const body = await request.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Please provide a valid email address");
    }

    const { email } = parsed.data;

    // Always return success (prevent email enumeration)
    const genericResponse = success({
      message: "If an account exists with that email, a reset link has been sent.",
    });

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      return genericResponse;
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex");
    // Hash before storing so a DB leak doesn't expose tokens
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Delete any existing unused tokens for this email (cleanup)
    await prisma.passwordResetToken.deleteMany({
      where: { email, usedAt: null },
    });

    // Create token with 1-hour expiry
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send password reset email (fire-and-forget)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    getEmailContentWithDefaults("password_reset")
      .then((content) =>
        sendEmail({
          type: "password_reset",
          to: user.email,
          subject: "Reset Your Password — ResinPlug",
          react: createElement(PasswordReset, {
            firstName: user.name || undefined,
            resetUrl,
            customHeading: content.heading,
            customBody: content.body,
            customButtonText: content.buttonText,
          }),
          userId: user.id,
        })
      )
      .catch((e) => console.error("Password reset email error:", e));

    return genericResponse;
  } catch (err) {
    console.error("POST /api/auth/forgot-password error:", err);
    return serverError();
  }
}

import { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";

const resetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { token, password } = parsed.data;

    // Hash the incoming token to match stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Look up valid, unused, non-expired token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!resetToken) {
      return badRequest("Invalid or expired reset link. Please request a new one.");
    }

    // Hash the new password (same as registration: bcryptjs, 12 rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { hashedPassword, needsPasswordSetup: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return success({ message: "Password has been reset successfully. You can now log in." });
  } catch (err) {
    console.error("POST /api/auth/reset-password error:", err);
    return serverError();
  }
}

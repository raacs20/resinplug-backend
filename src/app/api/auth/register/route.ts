import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { createNotification } from "@/lib/notifications";
import { sendEmail, resolveRecipients, getEmailContentWithDefaults } from "@/lib/email";
import { createElement } from "react";
import WelcomeEmail from "@/emails/WelcomeEmail";
import { z } from "zod";
import { Prisma } from "@prisma/client";

/* ── Rate limiting: 3 registrations per IP per hour ── */
const registerRateLimitMap = new Map<string, { count: number; reset: number }>();
const REGISTER_RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const REGISTER_RATE_LIMIT = 3;

function isRegisterRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = registerRateLimitMap.get(ip);
  if (!entry || now >= entry.reset) {
    registerRateLimitMap.set(ip, { count: 1, reset: now + REGISTER_RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > REGISTER_RATE_LIMIT;
}

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of registerRateLimitMap) {
    if (now >= entry.reset) registerRateLimitMap.delete(ip);
  }
}, 10 * 60 * 1000);

const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRegisterRateLimited(ip)) {
      return badRequest("Too many registration attempts. Try again later.");
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { name, email, password, phone } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, hashedPassword, phone },
    });

    // Fire-and-forget notification for admin
    createNotification(
      "new_customer",
      "New Customer",
      `${user.name || user.email} just registered`,
      `/admin/customers`
    ).catch((e) => console.error("Notification error:", e));

    // Fire-and-forget welcome email
    getEmailContentWithDefaults("welcome")
      .then((content) =>
        resolveRecipients("welcome", user.email).then((recipients) =>
          Promise.all(
            recipients.map((to) =>
              sendEmail({
                type: "welcome",
                to,
                subject: "Welcome to ResinPlug!",
                react: createElement(WelcomeEmail, {
                  name: user.name || undefined,
                  email: user.email,
                  customHeading: content.heading,
                  customBody: content.body,
                  customButtonText: content.buttonText,
                }),
                userId: user.id,
              })
            )
          )
        )
      )
      .catch((e) => console.error("Welcome email error:", e));

    return success(
      { id: user.id, name: user.name, email: user.email },
      { status: 201 }
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return badRequest("An account with this email already exists");
    }
    console.error("POST /api/auth/register error:", err);
    return serverError();
  }
}

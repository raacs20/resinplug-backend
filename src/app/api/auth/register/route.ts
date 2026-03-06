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
import { registerLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const { limited } = await checkRateLimit(registerLimiter, getClientIp(request));
    if (limited) {
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

    let hashedPassword: string;
    let user: { id: string; name: string | null; email: string };
    try {
      hashedPassword = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: { name, email, hashedPassword, phone },
        select: { id: true, name: true, email: true },
      });
    } catch (createErr) {
      // Handle P2002 (unique email constraint) — check for soft account
      if (
        createErr instanceof Prisma.PrismaClientKnownRequestError &&
        createErr.code === "P2002"
      ) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, needsPasswordSetup: true },
        });

        if (existingUser?.needsPasswordSetup) {
          // Upgrade soft account to real account
          const hashedPw = await bcrypt.hash(password, 12);
          const upgraded = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: name || undefined,
              hashedPassword: hashedPw,
              phone: phone || undefined,
              needsPasswordSetup: false,
            },
            select: { id: true, name: true, email: true },
          });

          // Fire-and-forget admin notification
          createNotification(
            "new_customer",
            "New Customer",
            `${upgraded.name || upgraded.email} activated their account`,
            `/admin/customers`
          ).catch((e) => console.error("Notification error:", e));

          // Fire-and-forget welcome email
          getEmailContentWithDefaults("welcome")
            .then((content) =>
              resolveRecipients("welcome", upgraded.email).then((recipients) =>
                Promise.all(
                  recipients.map((to) =>
                    sendEmail({
                      type: "welcome",
                      to,
                      subject: "Welcome to ResinPlug!",
                      react: createElement(WelcomeEmail, {
                        name: upgraded.name || undefined,
                        email: upgraded.email,
                        customHeading: content.heading,
                        customBody: content.body,
                        customButtonText: content.buttonText,
                      }),
                      userId: upgraded.id,
                    })
                  )
                )
              )
            )
            .catch((e) => console.error("Welcome email error:", e));

          return success(
            { id: upgraded.id, name: upgraded.name, email: upgraded.email },
            { status: 201 }
          );
        }

        return badRequest("An account with this email already exists");
      }
      throw createErr;
    }

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
    console.error("POST /api/auth/register error:", err);
    return serverError();
  }
}

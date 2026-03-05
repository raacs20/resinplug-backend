import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import React from "react";

/* ── Resend client (lazy init) ── */

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(key);
  }
  return resendClient;
}

/* ── Email type definitions ── */

export interface EmailType {
  type: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultRecipient: "customer" | "admin" | "both";
}

export const EMAIL_TYPES: EmailType[] = [
  {
    type: "order_placed",
    label: "Order Placed",
    description: "Sent when a customer places an order",
    defaultEnabled: true,
    defaultRecipient: "customer",
  },
  {
    type: "order_shipped",
    label: "Order Shipped",
    description: "Sent when an order status changes to shipped",
    defaultEnabled: true,
    defaultRecipient: "customer",
  },
  {
    type: "order_delivered",
    label: "Order Delivered",
    description: "Sent when an order is marked as delivered",
    defaultEnabled: true,
    defaultRecipient: "customer",
  },
  {
    type: "order_cancelled",
    label: "Order Cancelled",
    description: "Sent when an order is cancelled",
    defaultEnabled: true,
    defaultRecipient: "customer",
  },
  {
    type: "tracking_update",
    label: "Tracking Update",
    description: "Sent when a tracking number is added to an order",
    defaultEnabled: true,
    defaultRecipient: "customer",
  },
  {
    type: "welcome",
    label: "Welcome Email",
    description: "Sent when a new customer creates an account",
    defaultEnabled: true,
    defaultRecipient: "customer",
  },
];

/* ── Settings helpers ── */

export async function isEmailEnabled(type: string): Promise<boolean> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: `email_${type}_enabled` },
  });
  if (!setting) {
    // Default from EMAIL_TYPES
    const def = EMAIL_TYPES.find((e) => e.type === type);
    return def?.defaultEnabled ?? true;
  }
  return setting.value === "true";
}

export async function getEmailRecipient(
  type: string
): Promise<"customer" | "admin" | "both"> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: `email_${type}_recipient` },
  });
  if (!setting) {
    const def = EMAIL_TYPES.find((e) => e.type === type);
    return def?.defaultRecipient ?? "customer";
  }
  return setting.value as "customer" | "admin" | "both";
}

export async function getAdminEmail(): Promise<string> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "admin_email" },
  });
  return setting?.value || process.env.EMAIL_FROM?.replace(/.*<|>.*/g, "") || "admin@resinplug.com";
}

/* ── Core send function ── */

interface SendEmailOptions {
  type: string;
  to: string;
  subject: string;
  react: React.ReactElement;
  orderId?: string;
  userId?: string;
  skipEnabledCheck?: boolean; // For test emails
}

export async function sendEmail({
  type,
  to,
  subject,
  react,
  orderId,
  userId,
  skipEnabledCheck = false,
}: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  // Check if enabled (unless test send)
  if (!skipEnabledCheck) {
    const enabled = await isEmailEnabled(type);
    if (!enabled) return { success: false };
  }

  const from = process.env.EMAIL_FROM || "ResinPlug <onboarding@resend.dev>";

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      react,
    });

    if (error) {
      // Log failure
      await prisma.emailLog.create({
        data: {
          type,
          to,
          subject,
          status: "failed",
          error: error.message,
          orderId,
          userId,
        },
      });
      console.error(`Email send failed [${type}]:`, error.message);
      return { success: false };
    }

    // Log success
    await prisma.emailLog.create({
      data: {
        type,
        to,
        subject,
        status: "sent",
        orderId,
        userId,
      },
    });

    return { success: true, id: data?.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    // Log failure
    await prisma.emailLog
      .create({
        data: {
          type,
          to,
          subject,
          status: "failed",
          error: errorMsg,
          orderId,
          userId,
        },
      })
      .catch(() => {}); // Don't fail if logging fails

    console.error(`Email send error [${type}]:`, errorMsg);
    return { success: false };
  }
}

/* ── Convenience senders ── */

// Resolves recipient addresses based on settings
export async function resolveRecipients(
  type: string,
  customerEmail: string
): Promise<string[]> {
  const recipientType = await getEmailRecipient(type);
  const adminEmail = await getAdminEmail();

  switch (recipientType) {
    case "customer":
      return [customerEmail];
    case "admin":
      return [adminEmail];
    case "both":
      return [customerEmail, adminEmail];
    default:
      return [customerEmail];
  }
}

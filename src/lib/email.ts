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

  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.error("EMAIL_FROM environment variable is not set — skipping email send");
    return { success: false };
  }

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

/* ── Content overrides ── */

// Default content for each email type (used as placeholder values in the editor)
export const EMAIL_DEFAULTS: Record<string, Record<string, string>> = {
  order_placed: {
    heading: "Order Confirmed! 🎉",
    body: "Hi {firstName}, thank you for your order! We've received your order and are getting it ready.",
    buttonText: "Track Your Order",
  },
  order_shipped: {
    heading: "Your Order Has Shipped! 📦",
    body: "Hi {firstName}, great news! Your order {orderNumber} has been shipped and is on its way to you.",
    body2: "You'll receive another email with tracking information once it's available.",
    buttonText: "Track Your Order",
  },
  order_delivered: {
    heading: "Your Order Has Been Delivered! ✅",
    body: "Hi {firstName}, your order {orderNumber} has been delivered. We hope you love your new products!",
    body2: "If you have a moment, we'd love to hear what you think. Leave a review and earn 100 reward points!",
    buttonText: "Leave a Review",
  },
  order_cancelled: {
    heading: "Order Cancelled",
    body: "Hi {firstName}, your order {orderNumber} has been cancelled. If you used any credits, they have been refunded to your account.",
    body2: "If you didn't request this cancellation or have any questions, please reach out to our support team.",
    buttonText: "Contact Support",
  },
  tracking_update: {
    heading: "Your Tracking Info Is Here! 🚚",
    body: "Hi {firstName}, your order {orderNumber} now has tracking information available.",
    buttonText: "Track Your Package",
  },
  welcome: {
    heading: "Welcome to ResinPlug! 🎉",
    body: "Hi {firstName}, thanks for creating an account with us! You're now part of the ResinPlug community.",
    buttonText: "Start Shopping",
  },
};

// Fetch saved content overrides from SiteSetting
export async function getEmailContent(type: string): Promise<Record<string, string>> {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { startsWith: `email_${type}_content_` } },
  });
  const content: Record<string, string> = {};
  for (const s of settings) {
    const field = s.key.replace(`email_${type}_content_`, "");
    content[field] = s.value;
  }
  return content;
}

// Get content with defaults as fallback
export async function getEmailContentWithDefaults(type: string): Promise<Record<string, string>> {
  const saved = await getEmailContent(type);
  const defaults = EMAIL_DEFAULTS[type] || {};
  return { ...defaults, ...saved };
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

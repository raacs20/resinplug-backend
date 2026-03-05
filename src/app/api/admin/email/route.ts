import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, serverError } from "@/lib/api-response";
import { EMAIL_TYPES } from "@/lib/email";

/* GET — list all email types with their current settings */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // Fetch all email-related settings
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { startsWith: "email_" },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // Build response with defaults
    const emailTypes = EMAIL_TYPES.map((et) => ({
      type: et.type,
      label: et.label,
      description: et.description,
      enabled:
        settingsMap[`email_${et.type}_enabled`] !== undefined
          ? settingsMap[`email_${et.type}_enabled`] === "true"
          : et.defaultEnabled,
      recipient:
        settingsMap[`email_${et.type}_recipient`] || et.defaultRecipient,
    }));

    return success(emailTypes);
  } catch (err) {
    console.error("Admin email GET error:", err);
    return serverError();
  }
}

/* PUT — update email type settings (toggle or recipient) */
export async function PUT(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { type, enabled, recipient } = body as {
      type: string;
      enabled?: boolean;
      recipient?: string;
    };

    if (!type) return badRequest("type is required");

    const validType = EMAIL_TYPES.find((et) => et.type === type);
    if (!validType) return badRequest("Invalid email type");

    const updates: Promise<unknown>[] = [];

    if (enabled !== undefined) {
      updates.push(
        prisma.siteSetting.upsert({
          where: { key: `email_${type}_enabled` },
          update: { value: String(enabled) },
          create: {
            key: `email_${type}_enabled`,
            value: String(enabled),
            label: `${validType.label} - Enabled`,
          },
        })
      );
    }

    if (recipient !== undefined) {
      if (!["customer", "admin", "both"].includes(recipient)) {
        return badRequest("recipient must be customer, admin, or both");
      }
      updates.push(
        prisma.siteSetting.upsert({
          where: { key: `email_${type}_recipient` },
          update: { value: recipient },
          create: {
            key: `email_${type}_recipient`,
            value: recipient,
            label: `${validType.label} - Recipient`,
          },
        })
      );
    }

    await Promise.all(updates);

    await logActivity(
      session!.user!.id,
      "email.settings_update",
      "email",
      undefined,
      `Updated ${validType.label} email settings`
    );

    return success({ type, enabled, recipient });
  } catch (err) {
    console.error("Admin email PUT error:", err);
    return serverError();
  }
}

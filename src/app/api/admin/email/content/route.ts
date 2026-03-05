import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, serverError } from "@/lib/api-response";
import { EMAIL_TYPES, EMAIL_DEFAULTS, getEmailContent } from "@/lib/email";

/* GET — fetch content overrides for a specific email type */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) return badRequest("type query param is required");

    const validType = EMAIL_TYPES.find((et) => et.type === type);
    if (!validType) return badRequest("Invalid email type");

    const saved = await getEmailContent(type);
    const defaults = EMAIL_DEFAULTS[type] || {};

    return success({
      type,
      defaults,
      saved,
      // Merged: saved overrides defaults
      content: { ...defaults, ...saved },
    });
  } catch (err) {
    console.error("Email content GET error:", err);
    return serverError();
  }
}

/* PUT — save content overrides for a specific email type */
export async function PUT(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { type, fields } = body as {
      type: string;
      fields: Record<string, string>;
    };

    if (!type || !fields) return badRequest("type and fields are required");

    const validType = EMAIL_TYPES.find((et) => et.type === type);
    if (!validType) return badRequest("Invalid email type");

    const defaults = EMAIL_DEFAULTS[type] || {};

    // Upsert each field, but only if it differs from the default
    const updates: Promise<unknown>[] = [];
    for (const [field, value] of Object.entries(fields)) {
      const key = `email_${type}_content_${field}`;
      if (value && value !== defaults[field]) {
        // Save override
        updates.push(
          prisma.siteSetting.upsert({
            where: { key },
            update: { value },
            create: {
              key,
              value,
              label: `${validType.label} - ${field}`,
            },
          })
        );
      } else {
        // Remove override (revert to default)
        updates.push(
          prisma.siteSetting
            .delete({ where: { key } })
            .catch(() => {}) // Ignore if doesn't exist
        );
      }
    }

    await Promise.all(updates);

    await logActivity(
      session!.user!.id,
      "email.content_update",
      "email",
      undefined,
      `Updated ${validType.label} email content`
    );

    // Return updated content
    const saved = await getEmailContent(type);
    return success({
      type,
      content: { ...defaults, ...saved },
    });
  } catch (err) {
    console.error("Email content PUT error:", err);
    return serverError();
  }
}

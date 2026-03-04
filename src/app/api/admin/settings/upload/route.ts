import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { uploadImage, isCloudinaryConfigured } from "@/lib/cloudinary";
import { optimizeAndSave } from "@/lib/image-optimizer";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) return badRequest("No file provided");
    if (!type || !["logo", "favicon"].includes(type)) {
      return badRequest('Invalid type. Must be "logo" or "favicon"');
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return badRequest("Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG");
    }

    // Validate file size (5MB max for branding assets)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return badRequest("File too large. Maximum 5MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let url: string;

    if (isCloudinaryConfigured()) {
      const result = await uploadImage(buffer, {
        folder: "resinplug/branding",
      });
      url = result.url;
    } else {
      // Self-hosted: optimize with sharp then save
      // Logos are typically landscape, favicons are square
      const isLogo = type === "logo";
      const result = await optimizeAndSave(buffer, {
        subfolder: "branding",
        maxWidth: isLogo ? 400 : 192,
        maxHeight: isLogo ? 200 : 192,
        quality: isLogo ? 85 : 80,
      });
      url = result.url;
    }

    // Auto-save the URL to the corresponding setting
    const settingKey = type === "logo" ? "brandLogo" : "brandFavicon";
    await prisma.siteSetting.upsert({
      where: { key: settingKey },
      update: { value: url },
      create: { key: settingKey, value: url, label: type === "logo" ? "Brand Logo" : "Brand Favicon" },
    });

    if (session?.user?.id) {
      await logActivity(session.user.id, `branding.${type}_upload`, "settings", settingKey, url);
    }

    return success({ url, type }, { status: 201 });
  } catch (err) {
    console.error("Branding upload error:", err);
    return serverError();
  }
}

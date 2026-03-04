import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { uploadImage, isCloudinaryConfigured } from "@/lib/cloudinary";
import { optimizeAndSave } from "@/lib/image-optimizer";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return badRequest("No file provided");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return badRequest("Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG");
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return badRequest("File too large. Maximum 10MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // If Cloudinary is configured, upload there (it has its own optimization)
    if (isCloudinaryConfigured()) {
      const result = await uploadImage(buffer, {
        folder: "resinplug/products",
      });

      return success({
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      }, { status: 201 });
    }

    // Self-hosted: optimize with sharp (resize + WebP + compress) then save
    const result = await optimizeAndSave(buffer, {
      subfolder: "products",
      maxWidth: 800,
      maxHeight: 800,
      quality: 80,
    });

    return success({
      url: result.url,
      publicId: null,
      width: result.width,
      height: result.height,
    }, { status: 201 });
  } catch (err) {
    console.error("Upload error:", err);
    return serverError();
  }
}

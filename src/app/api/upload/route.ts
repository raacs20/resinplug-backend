import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { uploadImage, isCloudinaryConfigured } from "@/lib/cloudinary";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

    // If Cloudinary is configured, upload there
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

    // Fallback: save to public/uploads/ directory (development only)
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split(".").pop() || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    return success({
      url: `/uploads/${filename}`,
      publicId: null,
      width: null,
      height: null,
    }, { status: 201 });
  } catch (err) {
    console.error("Upload error:", err);
    return serverError();
  }
}

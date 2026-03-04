import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/* ══════════════════════════════════════════════════════════════════════
   Image Optimizer — auto-converts uploads to optimized WebP

   Used by both /api/upload (product images) and /api/admin/settings/upload
   (branding assets). Replaces the old "raw buffer → disk" fallback with
   proper optimization: resize, compress, strip metadata, convert to WebP.

   sharp is the same library Next.js uses internally — fast, well-tested,
   and handles all common image formats (PNG, JPEG, GIF, TIFF, AVIF, etc.)
   ══════════════════════════════════════════════════════════════════════ */

export interface OptimizedResult {
  /** URL path to the saved file (e.g. "/uploads/products/1709545200-abc123.webp") */
  url: string;
  /** Optimized image width in pixels */
  width: number;
  /** Optimized image height in pixels */
  height: number;
  /** File size in bytes after optimization */
  sizeBytes: number;
}

interface OptimizeOptions {
  /** Subfolder inside public/uploads/ (e.g. "products", "branding") */
  subfolder?: string;
  /** Max width — image is resized to fit within this (default: 800) */
  maxWidth?: number;
  /** Max height — image is resized to fit within this (default: 800) */
  maxHeight?: number;
  /** WebP quality 1-100 (default: 80) */
  quality?: number;
}

/**
 * Optimize an image buffer and save it as WebP.
 *
 * 1. Resizes to fit within maxWidth × maxHeight (preserves aspect ratio, never upscales)
 * 2. Converts to WebP at the specified quality
 * 3. Strips EXIF/metadata (privacy + smaller file)
 * 4. Saves to public/uploads/{subfolder}/{timestamp}-{random}.webp
 *
 * @example
 *   const result = await optimizeAndSave(buffer, { subfolder: "products" });
 *   // result.url → "/uploads/products/1709545200000-a1b2c3.webp"
 */
export async function optimizeAndSave(
  buffer: Buffer,
  options?: OptimizeOptions
): Promise<OptimizedResult> {
  const {
    subfolder = "products",
    maxWidth = 800,
    maxHeight = 800,
    quality = 80,
  } = options || {};

  // Process with sharp: resize + convert to WebP + strip metadata
  const optimized = await sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",        // Fit within bounds, preserve aspect ratio
      withoutEnlargement: true, // Never upscale small images
    })
    .webp({ quality })
    .withMetadata(false as unknown as sharp.WriteableMetadata) // Strip EXIF data for privacy
    .toBuffer({ resolveWithObject: true });

  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `${timestamp}-${random}.webp`;

  // Ensure upload directory exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadsDir, { recursive: true });

  // Write optimized file to disk
  const filepath = path.join(uploadsDir, filename);
  await writeFile(filepath, optimized.data);

  return {
    url: `/uploads/${subfolder}/${filename}`,
    width: optimized.info.width,
    height: optimized.info.height,
    sizeBytes: optimized.info.size,
  };
}

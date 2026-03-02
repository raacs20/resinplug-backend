import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { z } from "zod";

const upsertSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["text", "image", "richtext", "json", "html"]).default("text"),
  value: z.string(),
  section: z.string().min(1),
  label: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

const bulkUpsertSchema = z.array(upsertSchema);

// GET - List all content blocks, optionally filtered by section
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const section = request.nextUrl.searchParams.get("section");
    const where = section ? { section } : {};
    const blocks = await prisma.contentBlock.findMany({
      where,
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });
    return success(blocks);
  } catch (err) {
    console.error("GET /api/admin/content error:", err);
    return serverError();
  }
}

// PUT - Bulk upsert content blocks
export async function PUT(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();

    // Support both single object and array
    const items = Array.isArray(body) ? body : [body];
    const parsed = bulkUpsertSchema.safeParse(items);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const results = await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.contentBlock.upsert({
          where: { key: item.key },
          update: {
            value: item.value,
            type: item.type,
            section: item.section,
            label: item.label,
            sortOrder: item.sortOrder,
          },
          create: item,
        })
      )
    );

    await logActivity(
      (session!.user as any).id,
      "content.update",
      "content",
      undefined,
      `Updated ${results.length} content block(s)`
    );

    return success(results);
  } catch (err) {
    console.error("PUT /api/admin/content error:", err);
    return serverError();
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, serverError } from "@/lib/api-response";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const records = await prisma.pageSeo.findMany();
    return success(records);
  } catch (err) {
    console.error("Admin SEO list error:", err);
    return serverError();
  }
}

export async function PUT(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { pageSlug, metaTitle, metaDescription, metaKeywords, ogImage } = body;

    if (!pageSlug) {
      return badRequest("pageSlug is required");
    }

    const record = await prisma.pageSeo.upsert({
      where: { pageSlug },
      update: {
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(metaKeywords !== undefined && { metaKeywords }),
        ...(ogImage !== undefined && { ogImage }),
      },
      create: {
        pageSlug,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        metaKeywords: metaKeywords || null,
        ogImage: ogImage || null,
      },
    });

    await logActivity(session!.user!.id, "seo.update", "seo", record.id, `Updated SEO for ${pageSlug}`);

    return success(record);
  } catch (err) {
    console.error("Admin SEO upsert error:", err);
    return serverError();
  }
}

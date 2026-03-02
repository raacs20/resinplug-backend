import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";
import { logActivity } from "@/lib/activity-log";

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// GET - list all FAQs
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const faqs = await prisma.fAQ.findMany({ orderBy: { sortOrder: "asc" } });
    return success(faqs);
  } catch (err) {
    return serverError("Failed to fetch FAQs");
  }
}

// POST - create FAQ
export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const parsed = faqSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    const maxOrder = await prisma.fAQ.aggregate({ _max: { sortOrder: true } });
    const faq = await prisma.fAQ.create({
      data: {
        ...parsed.data,
        sortOrder: parsed.data.sortOrder ?? (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    const adminId = (session!.user as any).id;
    await logActivity(adminId, "faq.create", "faq", faq.id, parsed.data.question).catch(() => {});
    return success(faq);
  } catch (err) {
    return serverError("Failed to create FAQ");
  }
}

// PUT - update FAQ
export async function PUT(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return badRequest("FAQ ID is required");

    const faq = await prisma.fAQ.update({ where: { id }, data });
    const adminId = (session!.user as any).id;
    await logActivity(adminId, "faq.update", "faq", faq.id).catch(() => {});
    return success(faq);
  } catch (err) {
    return serverError("Failed to update FAQ");
  }
}

// DELETE - delete FAQ
export async function DELETE(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await req.json();
    if (!id) return badRequest("FAQ ID is required");

    await prisma.fAQ.delete({ where: { id } });
    const adminId = (session!.user as any).id;
    await logActivity(adminId, "faq.delete", "faq", id).catch(() => {});
    return success({ deleted: true });
  } catch (err) {
    return serverError("Failed to delete FAQ");
  }
}

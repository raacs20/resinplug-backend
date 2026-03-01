import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    if (typeof body.verified !== "boolean") {
      return badRequest("Field 'verified' must be a boolean");
    }

    // Verify the review exists
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Review not found");
    }

    const review = await prisma.review.update({
      where: { id },
      data: { verified: body.verified },
      include: {
        product: { select: { id: true, name: true, slug: true, image: true, category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return success(serializeDecimals(review));
  } catch (err) {
    console.error("Admin review update error:", err);
    return serverError();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    // Verify the review exists
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Review not found");
    }

    await prisma.review.delete({ where: { id } });

    return success({ deleted: true, id });
  } catch (err) {
    console.error("Admin review delete error:", err);
    return serverError();
  }
}

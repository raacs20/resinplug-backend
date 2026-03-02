import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { logActivity } from "@/lib/activity-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, slug: true, image: true, category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!review) {
      return notFound("Review not found");
    }

    return success(serializeDecimals(review));
  } catch (err) {
    console.error("Admin review detail error:", err);
    return serverError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    // Verify the review exists
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Review not found");
    }

    const data: Record<string, unknown> = {};

    if (typeof body.verified === "boolean") {
      data.verified = body.verified;
    }

    if (typeof body.status === "string") {
      data.verified = body.status === "approved";
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No valid fields provided for update");
    }

    const review = await prisma.review.update({
      where: { id },
      data,
      include: {
        product: { select: { id: true, name: true, slug: true, image: true, category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity(
      session!.user!.id!,
      "review.update",
      "review",
      id,
      `Review updated: verified=${review.verified}`
    );

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
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    // Verify the review exists
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Review not found");
    }

    await prisma.review.delete({ where: { id } });

    await logActivity(
      session!.user!.id!,
      "review.delete",
      "review",
      id,
      `Review deleted`
    );

    return success({ deleted: true, id });
  } catch (err) {
    console.error("Admin review delete error:", err);
    return serverError();
  }
}

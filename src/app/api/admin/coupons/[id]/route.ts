import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, notFound, badRequest, serverError } from "@/lib/api-response";
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

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return notFound("Coupon not found");
    }

    return success(serializeDecimals(coupon));
  } catch (err) {
    console.error("Admin coupon detail error:", err);
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

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return notFound("Coupon not found");

    const allowed = ["code", "discountType", "discountValue", "minOrder", "maxUses", "isActive", "expiresAt"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "code") {
          data[key] = (body[key] as string).toUpperCase();
        } else if (key === "expiresAt") {
          data[key] = body[key] ? new Date(body[key]) : null;
        } else {
          data[key] = body[key];
        }
      }
    }

    if (data.discountType && !["percentage", "fixed"].includes(data.discountType as string)) {
      return badRequest("discountType must be 'percentage' or 'fixed'");
    }

    const coupon = await prisma.coupon.update({ where: { id }, data });

    await logActivity(
      session!.user!.id!,
      "coupon.update",
      "coupon",
      id,
      `Coupon updated: ${coupon.code}`
    );

    return success(serializeDecimals(coupon));
  } catch (err) {
    console.error("Admin coupon update error:", err);
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
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return notFound("Coupon not found");

    await prisma.coupon.delete({ where: { id } });

    await logActivity(
      session!.user!.id!,
      "coupon.delete",
      "coupon",
      id,
      `Coupon deleted: ${existing.code}`
    );

    return success({ deleted: true });
  } catch (err) {
    console.error("Admin coupon delete error:", err);
    return serverError();
  }
}

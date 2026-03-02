import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { z } from "zod";

const discountCreateSchema = z.object({
  name: z.string().min(1, "name is required"),
  type: z.enum(["percentage", "fixed"], { errorMap: () => ({ message: "type must be 'percentage' or 'fixed'" }) }),
  value: z.number({ required_error: "value is required" }).positive("value must be a positive number"),
  appliesTo: z.string().optional().default("all"),
  targetIds: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

const discountUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["percentage", "fixed"]).optional(),
  value: z.number().positive().optional(),
  appliesTo: z.string().optional(),
  targetIds: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
    });

    return success(serializeDecimals(discounts));
  } catch (err) {
    console.error("Admin marketing list error:", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = discountCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { name, type, value, appliesTo, targetIds, startDate, endDate, isActive } = parsed.data;

    const discount = await prisma.discount.create({
      data: {
        name,
        type,
        value,
        appliesTo,
        targetIds: targetIds ?? null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        isActive,
      },
    });

    await logActivity(session!.user!.id, "discount.create", "discount", discount.id, discount.name);

    return success(serializeDecimals(discount), { status: 201 });
  } catch (err) {
    console.error("Admin marketing create error:", err);
    return serverError();
  }
}

export async function PUT(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return badRequest("id is required");
    }

    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) return notFound("Discount not found");

    const parsed = discountUpdateSchema.safeParse(fields);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const validatedFields = parsed.data;
    const data: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(validatedFields)) {
      if (val !== undefined) {
        data[key] = val;
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No valid fields provided for update");
    }

    const discount = await prisma.discount.update({ where: { id }, data });

    await logActivity(session!.user!.id, "discount.update", "discount", id, `Updated ${Object.keys(data).join(", ")}`);

    return success(serializeDecimals(discount));
  } catch (err) {
    console.error("Admin marketing update error:", err);
    return serverError();
  }
}

export async function DELETE(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    let id = searchParams.get("id");

    // Also support id in the body
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // No body provided
      }
    }

    if (!id) {
      return badRequest("id is required");
    }

    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) return notFound("Discount not found");

    await prisma.discount.delete({ where: { id } });

    await logActivity(session!.user!.id, "discount.delete", "discount", id);

    return success({ deleted: true });
  } catch (err) {
    console.error("Admin marketing delete error:", err);
    return serverError();
  }
}

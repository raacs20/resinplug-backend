import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, notFound, badRequest, forbidden, serverError } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  street: z.string().min(1).max(255).optional(),
  apartment: z.string().max(100).optional().nullable(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  zip: z.string().min(1).max(20).optional(),
  country: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
});

// PUT /api/addresses/:id — update address
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const { id } = await params;
    const existing = await prisma.savedAddress.findUnique({ where: { id } });
    if (!existing) return notFound("Address not found");
    if (existing.userId !== session.user.id) return forbidden();

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const updated = await prisma.savedAddress.update({
      where: { id },
      data: parsed.data,
    });

    return success(updated);
  } catch (err) {
    console.error("PUT /api/addresses/:id error:", err);
    return serverError();
  }
}

// DELETE /api/addresses/:id — delete address
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const { id } = await params;
    const existing = await prisma.savedAddress.findUnique({ where: { id } });
    if (!existing) return notFound("Address not found");
    if (existing.userId !== session.user.id) return forbidden();

    await prisma.savedAddress.delete({ where: { id } });

    return success({ deleted: id });
  } catch (err) {
    console.error("DELETE /api/addresses/:id error:", err);
    return serverError();
  }
}

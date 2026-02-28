import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, notFound, forbidden, serverError } from "@/lib/api-response";

// PATCH /api/addresses/:id/default — set address as default
export async function PATCH(
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

    // Unset all defaults for this user, then set the target
    await prisma.$transaction([
      prisma.savedAddress.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.savedAddress.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return success({ id, isDefault: true });
  } catch (err) {
    console.error("PATCH /api/addresses/:id/default error:", err);
    return serverError();
  }
}

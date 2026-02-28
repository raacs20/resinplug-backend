import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, serverError } from "@/lib/api-response";

// DELETE /api/wishlist/:productId — remove single item from wishlist
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const { productId } = await params;

    await prisma.wishlist.deleteMany({
      where: { userId: session.user.id, productId },
    });

    return success({ removed: productId });
  } catch (err) {
    console.error("DELETE /api/wishlist/:productId error:", err);
    return serverError();
  }
}

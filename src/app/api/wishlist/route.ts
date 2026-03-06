import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, badRequest, unauthorized, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { formatProduct } from "@/lib/serialize";

// GET /api/wishlist — list user's wishlist with product details
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const items = await prisma.wishlist.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: { variants: { orderBy: { sortOrder: "asc" } } },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    // Map to include product details with formatted prices
    const data = items
      .filter((item) => item.product)
      .map((item) => ({
        productId: item.productId,
        addedAt: item.addedAt.toISOString(),
        product: formatProduct(serializeDecimals(item.product) as Record<string, unknown>),
      }));

    return success(data);
  } catch (err) {
    console.error("GET /api/wishlist error:", err);
    return serverError();
  }
}

// POST /api/wishlist — add product to wishlist
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const { productId } = await request.json();
    if (!productId) return badRequest("productId is required");

    // Upsert to avoid duplicate errors
    await prisma.wishlist.upsert({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
      create: { userId: session.user.id, productId },
      update: {}, // no-op if exists
    });

    return success({ productId }, { status: 201 });
  } catch (err) {
    console.error("POST /api/wishlist error:", err);
    return serverError();
  }
}

// DELETE /api/wishlist — clear entire wishlist
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    await prisma.wishlist.deleteMany({
      where: { userId: session.user.id },
    });

    return success({ cleared: true });
  } catch (err) {
    console.error("DELETE /api/wishlist error:", err);
    return serverError();
  }
}

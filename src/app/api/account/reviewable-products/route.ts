import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

/**
 * GET /api/account/reviewable-products
 * Returns order-items the authenticated user can review:
 *   - order not cancelled
 *   - productId is set
 *   - no review already linked to that order-item
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          userId: session.user.id,
          status: { not: "cancelled" },
        },
        productId: { not: null },
        review: null, // no review linked yet
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: { order: { createdAt: "desc" } },
    });

    // Collect unique productIds to fetch slugs
    const productIds = [
      ...new Set(items.map((i) => i.productId).filter(Boolean)),
    ] as string[];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, slug: true },
    });

    const slugMap = new Map(products.map((p) => [p.id, p.slug]));

    const result = items.map((item) => ({
      orderItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      productSlug: slugMap.get(item.productId!) || null,
      weight: item.weight,
      orderNumber: item.order.orderNumber,
      orderDate: item.order.createdAt,
    }));

    return success(serializeDecimals(result));
  } catch (err) {
    console.error("GET /api/account/reviewable-products error:", err);
    return serverError();
  }
}

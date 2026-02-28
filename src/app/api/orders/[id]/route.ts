import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, notFound, forbidden, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: { items: true },
    });

    if (!order) return notFound("Order not found");

    // If order belongs to a user, only that user can view it
    if (order.userId) {
      if (!session?.user?.id || session.user.id !== order.userId) {
        return forbidden("You do not have access to this order");
      }
    }
    // Guest orders (no userId) are accessible by orderNumber lookup

    return success(serializeDecimals(order));
  } catch (err) {
    console.error("GET /api/orders/[id] error:", err);
    return serverError();
  }
}

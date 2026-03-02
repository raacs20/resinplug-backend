import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        refunds: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "asc" } },
        orderNotes: { orderBy: { createdAt: "desc" } },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            creditBalance: true,
          },
        },
      },
    });

    if (!order) {
      return notFound("Order not found");
    }

    return success(serializeDecimals(order));
  } catch (err) {
    console.error("Admin order detail error:", err);
    return serverError();
  }
}

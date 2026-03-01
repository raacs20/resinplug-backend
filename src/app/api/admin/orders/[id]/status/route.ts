import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

const VALID_STATUSES = ["processing", "shipped", "in_transit", "delivered", "cancelled"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status as ValidStatus)) {
      return badRequest(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      );
    }

    // Verify the order exists
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Order not found");
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: status as ValidStatus },
      include: { items: true },
    });

    return success(serializeDecimals(order));
  } catch (err) {
    console.error("Admin order status update error:", err);
    return serverError();
  }
}

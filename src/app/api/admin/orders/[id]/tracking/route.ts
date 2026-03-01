import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { trackingNumber, carrierName } = body;

    if (!trackingNumber && !carrierName) {
      return badRequest("At least one of trackingNumber or carrierName is required");
    }

    // Verify the order exists
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Order not found");
    }

    const data: Record<string, string> = {};
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
    if (carrierName !== undefined) data.carrierName = carrierName;

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });

    return success(serializeDecimals(order));
  } catch (err) {
    console.error("Admin order tracking update error:", err);
    return serverError();
  }
}

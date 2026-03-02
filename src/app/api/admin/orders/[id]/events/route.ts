import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";

// GET - list events for an order
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const events = await prisma.orderEvent.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
    });

    const serialized = events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    }));

    return success(serialized);
  } catch (err) {
    console.error("Failed to fetch order events:", err);
    return serverError("Failed to fetch order events");
  }
}

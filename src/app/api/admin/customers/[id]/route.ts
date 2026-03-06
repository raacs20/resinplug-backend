import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";
import { logActivity } from "@/lib/activity-log";
import { z } from "zod";

const banSchema = z.object({
  isBanned: z.boolean({ required_error: "isBanned (boolean) is required" }),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isBanned: true,
        creditBalance: true,
        createdAt: true,
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        credits: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return notFound("Customer not found");
    }

    // Compute stats
    const totalSpent = user.orders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );
    const orderCount = user.orders.length;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    const lastOrder = user.orders[0]; // already sorted desc
    const daysSinceLastOrder = lastOrder
      ? Math.floor(
          (Date.now() - new Date(lastOrder.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const result = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isBanned: user.isBanned,
      creditBalance: user.creditBalance,
      createdAt: user.createdAt,
      orders: user.orders,
      creditHistory: user.credits,
      stats: {
        totalSpent: Math.round(totalSpent * 100) / 100,
        orderCount,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        daysSinceLastOrder,
      },
    };

    return success(serializeDecimals(result));
  } catch (err) {
    console.error("Admin customer detail error:", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = banSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { isBanned } = parsed.data;
    const user = await prisma.user.update({
      where: { id },
      data: { isBanned },
    });

    const adminId = (session!.user as Record<string, unknown>).id as string;
    await logActivity(adminId, isBanned ? "customer.ban" : "customer.unban", "customer", id).catch(() => {});

    return success({ isBanned: user.isBanned });
  } catch (err) {
    return serverError("Failed to update customer");
  }
}

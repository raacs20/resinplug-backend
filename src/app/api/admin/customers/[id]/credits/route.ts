import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, type, reason, orderId } = body;

    if (typeof amount !== "number") {
      return badRequest("amount must be a number");
    }

    const validTypes = ["earned", "spent", "refund", "manual"];
    if (!validTypes.includes(type)) {
      return badRequest("type must be one of: earned, spent, refund, manual");
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("Customer not found");

    // Determine balance change direction
    let balanceChange: number;
    if (type === "spent") {
      balanceChange = -Math.abs(amount);
    } else if (type === "manual") {
      // Manual can be positive or negative based on the sign of amount
      balanceChange = amount;
    } else {
      // earned, refund — always positive
      balanceChange = Math.abs(amount);
    }

    // Use a transaction to create credit and update balance atomically
    const credit = await prisma.$transaction(async (tx) => {
      const creditRecord = await tx.credit.create({
        data: {
          userId: id,
          amount,
          type: type as "earned" | "spent" | "refund" | "manual",
          reason: reason || null,
          orderId: orderId || null,
        },
      });

      await tx.user.update({
        where: { id },
        data: {
          creditBalance: { increment: balanceChange },
        },
      });

      return creditRecord;
    });

    await logActivity(session!.user!.id, "credit.adjust", "customer", id, `${type} ${amount} credits${reason ? `: ${reason}` : ""}`);

    return success(serializeDecimals(credit), { status: 201 });
  } catch (err) {
    console.error("Admin credit create error:", err);
    return serverError();
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, creditBalance: true },
    });
    if (!user) return notFound("Customer not found");

    const credits = await prisma.credit.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    });

    return success(serializeDecimals({
      credits,
      totalBalance: user.creditBalance,
    }));
  } catch (err) {
    console.error("Admin credit history error:", err);
    return serverError();
  }
}

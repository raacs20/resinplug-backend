import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, serverError } from "@/lib/api-response";
import { calculateTier } from "@/lib/rewards";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        creditBalance: true,
      },
    });

    if (!user) {
      return unauthorized("User not found");
    }

    // Calculate lifetime earnings (sum of all "earned" type credits)
    const earned = await prisma.credit.aggregate({
      where: { userId: session.user.id, type: "earned" },
      _sum: { amount: true },
    });

    const lifetimeEarnings = Number(earned._sum.amount || 0);
    const tier = calculateTier(lifetimeEarnings);

    return success({
      ...user,
      creditBalance: Number(user.creditBalance),
      lifetimeEarnings,
      tier,
    });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return serverError();
  }
}

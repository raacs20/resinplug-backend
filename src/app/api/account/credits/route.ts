import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

/**
 * GET /api/account/credits — returns the authenticated user's credit history.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const credits = await prisma.credit.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return success(serializeDecimals(credits));
  } catch (err) {
    console.error("GET /api/account/credits error:", err);
    return serverError();
  }
}

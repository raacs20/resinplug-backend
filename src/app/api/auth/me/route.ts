import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, serverError } from "@/lib/api-response";

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
      },
    });

    if (!user) {
      return unauthorized("User not found");
    }

    return success(user);
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return serverError();
  }
}

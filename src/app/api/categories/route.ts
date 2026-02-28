import { prisma } from "@/lib/prisma";
import { success, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const counts = await prisma.product.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: { id: true },
    });

    const categories = counts.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));

    return success(categories);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    return serverError();
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, notFound, serverError } from "@/lib/api-response";
import { formatProduct } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    const collection = await prisma.collection.findUnique({
      where: { name },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              include: { variants: { orderBy: { sortOrder: "asc" } } },
            },
          },
        },
      },
    });

    if (!collection) return notFound(`Collection "${name}" not found`);

    const products = collection.products
      .map((pc) => pc.product)
      .filter((p) => p.isActive);

    return success({
      name: collection.name,
      label: collection.label,
      products: products.map((p) => formatProduct(p as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    console.error("GET /api/collections/[name] error:", err);
    return serverError();
  }
}

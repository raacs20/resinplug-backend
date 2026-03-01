import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category && ["Indica", "Hybrid", "Sativa"].includes(category)) {
      where.category = category;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return success(serializeDecimals(products), {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin products list error:", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { name, salePrice, originalPrice, image, category, thc, popularity, featured, variants } = body;

    if (!name || !salePrice || !originalPrice || !image || !category || !thc) {
      return badRequest("Missing required fields: name, salePrice, originalPrice, image, category, thc");
    }

    if (!["Indica", "Hybrid", "Sativa"].includes(category)) {
      return badRequest("Invalid category");
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return badRequest("A product with a similar name already exists");
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        salePrice,
        originalPrice,
        image,
        category,
        thc,
        popularity: popularity || 0,
        featured: featured || false,
        variants: variants?.length
          ? {
              create: variants.map((v: { weight: string; price: number; originalPrice?: number; discount?: string }, i: number) => ({
                weight: v.weight,
                price: v.price,
                originalPrice: v.originalPrice || null,
                discount: v.discount || null,
                sortOrder: i,
              })),
            }
          : {
              create: [
                { weight: "1g", price: salePrice, sortOrder: 0 },
                { weight: "3g", price: salePrice * 1.5, sortOrder: 1 },
                { weight: "15g", price: salePrice * 3, originalPrice: salePrice * 3.33, discount: "10%", sortOrder: 2 },
                { weight: "28g", price: salePrice * 4.5, originalPrice: salePrice * 5.6, discount: "20%", sortOrder: 3 },
              ],
            },
      },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });

    return success(serializeDecimals(product), { status: 201 });
  } catch (err) {
    console.error("Admin product create error:", err);
    return serverError();
  }
}

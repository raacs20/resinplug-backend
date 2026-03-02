import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { formatProduct } from "@/lib/serialize";
import { z } from "zod";
import { Category, Prisma } from "@prisma/client";

const querySchema = z.object({
  category: z.nativeEnum(Category).optional(),
  sort: z.enum(["price_asc", "price_desc", "popularity", "name", "newest"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  active: z.enum(["true", "false"]).optional().default("true"),
});

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  salePrice: z.number().positive(),
  originalPrice: z.number().positive(),
  image: z.string().min(1),
  category: z.nativeEnum(Category),
  thc: z.string().min(1),
  popularity: z.number().int().min(0).max(10).optional().default(0),
  featured: z.boolean().optional().default(false),
  variants: z
    .array(
      z.object({
        weight: z.string().min(1),
        price: z.number().positive(),
        originalPrice: z.number().positive().optional(),
        discount: z.string().optional(),
        sortOrder: z.number().int().optional().default(0),
      })
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { category, sort, page, limit, active } = parsed.data;

    const where: Prisma.ProductWhereInput = {};
    if (active === "true") where.isActive = true;
    if (category) where.category = category;

    let orderBy: Prisma.ProductOrderByWithRelationInput = { popularity: "desc" };
    switch (sort) {
      case "price_asc":
        orderBy = { salePrice: "asc" };
        break;
      case "price_desc":
        orderBy = { salePrice: "desc" };
        break;
      case "popularity":
        orderBy = { popularity: "desc" };
        break;
      case "name":
        orderBy = { name: "asc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.product.count({ where }),
    ]);

    return success(products.map(formatProduct), {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { variants, ...productData } = parsed.data;

    // Auto-generate slug if not provided
    const slug =
      productData.slug ??
      productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const product = await prisma.product.create({
      data: {
        ...productData,
        slug,
        variants: variants
          ? { create: variants }
          : undefined,
      },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });

    return success(formatProduct(product as unknown as Record<string, unknown>), { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return badRequest("A product with this slug already exists");
    }
    return serverError();
  }
}

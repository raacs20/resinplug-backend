import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";
import { Category } from "@prisma/client";
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

const productCreateSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z.string().min(1).optional(),
  salePrice: z.number().positive("salePrice must be a positive number"),
  originalPrice: z.number().positive("originalPrice must be a positive number"),
  image: z.string().optional().default(""),
  category: z.nativeEnum(Category, { errorMap: () => ({ message: "category must be Indica, Hybrid, or Sativa" }) }),
  thc: z.string().optional().default(""),
  popularity: z.number().int().min(0).max(10).optional().default(0),
  featured: z.boolean().optional().default(false),
  description: z.string().nullable().optional(),
  shortDesc: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  totalStockGrams: z.number().positive().nullable().optional(),
  stockUnit: z.string().optional().default("grams"),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  variants: z.array(z.object({
    weight: z.string().min(1),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    discount: z.string().optional(),
    sku: z.string().optional(),
    gramsPerUnit: z.number().optional(),
    sortOrder: z.number().int().optional(),
    isDefault: z.boolean().optional(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const {
      name, salePrice, originalPrice, image, category, thc, popularity, featured, variants,
      description, shortDesc, sku, totalStockGrams, stockUnit, metaTitle, metaDescription, metaKeywords,
    } = parsed.data;

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
        description: description ?? null,
        shortDesc: shortDesc ?? null,
        sku: sku ?? null,
        totalStockGrams: totalStockGrams ?? null,
        stockUnit: stockUnit ?? "grams",
        metaTitle: metaTitle ?? null,
        metaDescription: metaDescription ?? null,
        metaKeywords: metaKeywords ?? null,
        variants: variants?.length
          ? {
              create: variants.map((v, i: number) => ({
                weight: v.weight,
                price: v.price,
                originalPrice: v.originalPrice || null,
                discount: v.discount || null,
                sku: v.sku || null,
                gramsPerUnit: v.gramsPerUnit || null,
                sortOrder: v.sortOrder ?? i,
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

    await logActivity(session!.user!.id, "product.create", "product", product.id, product.name);

    return success(serializeDecimals(product), { status: 201 });
  } catch (err) {
    console.error("Admin product create error:", err);
    return serverError();
  }
}

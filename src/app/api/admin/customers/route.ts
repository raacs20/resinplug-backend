import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { success, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sort = searchParams.get("sort") || "recent"; // recent | orders | spent
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    // Determine ORDER BY clause based on sort param
    const orderByClause =
      sort === "spent"
        ? Prisma.sql`ORDER BY "totalSpent" DESC`
        : sort === "orders"
          ? Prisma.sql`ORDER BY "orderCount" DESC`
          : Prisma.sql`ORDER BY u."createdAt" DESC`;

    const searchParam = search ? `%${search}%` : null;

    // Use raw SQL for all sort modes — avoids N+1 loading all orders per user
    let customers: Array<{
      id: string;
      name: string | null;
      email: string;
      phone: string | null;
      role: string;
      createdAt: Date;
      orderCount: number;
      totalSpent: number;
    }>;
    let total: number;

    if (search) {
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM "User" u
        WHERE u.name ILIKE ${searchParam} OR u.email ILIKE ${searchParam}
      `;
      total = Number(countResult[0].count);

      customers = await prisma.$queryRaw`
        SELECT u.id, u.name, u.email, u.phone, u.role, u."createdAt",
               COUNT(o.id)::int AS "orderCount",
               COALESCE(SUM(o.total), 0)::float AS "totalSpent"
        FROM "User" u
        LEFT JOIN "Order" o ON o."userId" = u.id
        WHERE u.name ILIKE ${searchParam} OR u.email ILIKE ${searchParam}
        GROUP BY u.id
        ${orderByClause}
        LIMIT ${limit} OFFSET ${skip}
      `;
    } else {
      total = await prisma.user.count();

      customers = await prisma.$queryRaw`
        SELECT u.id, u.name, u.email, u.phone, u.role, u."createdAt",
               COUNT(o.id)::int AS "orderCount",
               COALESCE(SUM(o.total), 0)::float AS "totalSpent"
        FROM "User" u
        LEFT JOIN "Order" o ON o."userId" = u.id
        GROUP BY u.id
        ${orderByClause}
        LIMIT ${limit} OFFSET ${skip}
      `;
    }

    // Round totalSpent for consistency
    const formatted = customers.map((c) => ({
      ...c,
      totalSpent: Math.round(c.totalSpent * 100) / 100,
    }));

    return success(serializeDecimals(formatted), {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin customers list error:", err);
    return serverError();
  }
}

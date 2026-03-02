import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10)
    );
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    return success(notifications, {
      meta: { unreadCount, total, page, limit },
    });
  } catch (err) {
    console.error("GET /api/admin/notifications error:", err);
    return serverError();
  }
}

const createSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const notification = await prisma.notification.create({
      data: parsed.data,
    });

    return success(notification, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/notifications error:", err);
    return serverError();
  }
}

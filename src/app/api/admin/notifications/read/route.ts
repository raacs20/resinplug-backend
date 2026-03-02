import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";

const markReadSchema = z.union([
  z.object({ ids: z.array(z.string().min(1)).min(1) }),
  z.object({ all: z.literal(true) }),
]);

export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        "Provide either { ids: string[] } or { all: true }"
      );
    }

    const data = parsed.data;

    if ("all" in data && data.all) {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
    } else if ("ids" in data) {
      await prisma.notification.updateMany({
        where: { id: { in: data.ids } },
        data: { isRead: true },
      });
    }

    return success({ updated: true });
  } catch (err) {
    console.error("PUT /api/admin/notifications/read error:", err);
    return serverError();
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const settings = await prisma.siteSetting.findMany();
    // Convert to key-value map
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return success(map);
  } catch (err) {
    console.error("Admin settings get error:", err);
    return serverError();
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return badRequest("Body must be a key-value object");
    }

    // Upsert each key-value pair
    const entries = Object.entries(body as Record<string, string>);
    await Promise.all(
      entries.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value), label: key },
        })
      )
    );

    // Return updated settings
    const settings = await prisma.siteSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return success(map);
  } catch (err) {
    console.error("Admin settings update error:", err);
    return serverError();
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, serverError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const section = request.nextUrl.searchParams.get("section");
    const key = request.nextUrl.searchParams.get("key");

    if (key) {
      const block = await prisma.contentBlock.findUnique({ where: { key } });
      return success(block ? { [block.key]: block.value } : {});
    }

    const where = section ? { section } : {};
    const blocks = await prisma.contentBlock.findMany({
      where,
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });

    // Return as key-value map for easy consumption
    const map: Record<string, string> = {};
    for (const b of blocks) {
      map[b.key] = b.value;
    }
    return success(map);
  } catch (err) {
    console.error("GET /api/content error:", err);
    return serverError();
  }
}

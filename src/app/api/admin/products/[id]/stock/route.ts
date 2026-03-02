import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity-log";
import { success, badRequest, notFound, serverError } from "@/lib/api-response";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        totalStockGrams: true,
        stockUnit: true,
        reorderPoint: true,
        variants: {
          select: {
            id: true,
            weight: true,
            gramsPerUnit: true,
            stockOverride: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!product) {
      return notFound("Product not found");
    }

    return success(serializeDecimals(product));
  } catch (err) {
    console.error("Admin stock get error:", err);
    return serverError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { totalStockGrams, stockUnit, reorderPoint, reason } = body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return notFound("Product not found");
    }

    const data: Record<string, unknown> = {};
    if (totalStockGrams !== undefined) data.totalStockGrams = totalStockGrams;
    if (stockUnit !== undefined) data.stockUnit = stockUnit;
    if (reorderPoint !== undefined) data.reorderPoint = reorderPoint;

    if (Object.keys(data).length === 0) {
      return badRequest("No valid fields provided: totalStockGrams, stockUnit, reorderPoint");
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        totalStockGrams: true,
        stockUnit: true,
        reorderPoint: true,
        variants: {
          select: {
            id: true,
            weight: true,
            gramsPerUnit: true,
            stockOverride: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Create stock movement record if stock was changed
    if (totalStockGrams !== undefined) {
      const currentStock = Number(existing.totalStockGrams || 0);
      const newStock = Number(totalStockGrams);
      const diff = newStock - currentStock;

      if (diff !== 0) {
        const adminUser = session!.user;
        await prisma.stockMovement.create({
          data: {
            productId: id,
            type: "adjustment",
            quantity: diff,
            reason: reason || "Manual adjustment",
            adminName: adminUser?.name || adminUser?.email || "Admin",
          },
        });
      }
    }

    await logActivity(session!.user!.id, "stock.update", "product", id, `Updated stock: ${Object.keys(data).join(", ")}`);

    return success(serializeDecimals(product));
  } catch (err) {
    console.error("Admin stock update error:", err);
    return serverError();
  }
}

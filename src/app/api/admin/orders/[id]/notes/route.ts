import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { success, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";

const noteSchema = z.object({
  note: z.string().min(1, "Note is required"),
  isInternal: z.boolean().optional().default(true),
});

// GET - list notes for an order
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const notes = await prisma.orderNote.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    const serialized = notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    }));

    return success(serialized);
  } catch (err) {
    console.error("Failed to fetch order notes:", err);
    return serverError("Failed to fetch order notes");
  }
}

// POST - create a note for an order
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0].message);

    // Verify order exists
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return badRequest("Order not found");

    const adminName = session!.user!.name || session!.user!.email || "Admin";
    const adminId = session!.user!.id!;

    const note = await prisma.orderNote.create({
      data: {
        orderId: id,
        note: parsed.data.note,
        isInternal: parsed.data.isInternal,
        createdBy: adminName,
      },
    });

    // Also create an order event for the note
    try {
      await prisma.orderEvent.create({
        data: {
          orderId: id,
          type: "note_added",
          note: parsed.data.note,
          adminId,
          adminName,
        },
      });
    } catch {
      // Non-critical
    }

    return success({
      ...note,
      createdAt: note.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Failed to create order note:", err);
    return serverError("Failed to create order note");
  }
}

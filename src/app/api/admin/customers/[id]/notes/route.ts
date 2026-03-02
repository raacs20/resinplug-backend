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

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) return notFound("Customer not found");

    const notes = await prisma.customerNote.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    });

    // Enrich notes with admin name if possible
    const adminIds = [...new Set(notes.map((n) => n.createdBy))];
    const admins = await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true, email: true },
    });
    const adminMap = new Map(admins.map((a) => [a.id, a]));

    const enrichedNotes = notes.map((n) => {
      const admin = adminMap.get(n.createdBy);
      return {
        ...n,
        adminName: admin?.name || admin?.email || "Unknown",
      };
    });

    return success(serializeDecimals(enrichedNotes));
  } catch (err) {
    console.error("Admin customer notes list error:", err);
    return serverError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { note } = body;

    if (!note || typeof note !== "string" || !note.trim()) {
      return badRequest("note is required and must be a non-empty string");
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    if (!user) return notFound("Customer not found");

    const adminId = session!.user!.id!;

    const customerNote = await prisma.customerNote.create({
      data: {
        userId: id,
        note: note.trim(),
        createdBy: adminId,
      },
    });

    // Log activity
    await logActivity(
      adminId,
      "create",
      "customer_note",
      customerNote.id,
      `Added note to customer ${user.name || user.email}`
    );

    // Enrich with admin name
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true, email: true },
    });

    return success(
      serializeDecimals({
        ...customerNote,
        adminName: admin?.name || admin?.email || "Unknown",
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error("Admin customer note create error:", err);
    return serverError();
  }
}

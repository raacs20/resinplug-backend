import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  street: z.string().min(1).max(255),
  apartment: z.string().max(100).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip: z.string().min(1).max(20),
  country: z.string().min(1).max(100).default("Canada"),
  phone: z.string().min(1).max(20),
  isDefault: z.boolean().optional(),
});

// GET /api/addresses — list user's saved addresses
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const addresses = await prisma.savedAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return success(addresses);
  } catch (err) {
    console.error("GET /api/addresses error:", err);
    return serverError();
  }
}

// POST /api/addresses — create a new address
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const body = await request.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { isDefault, ...data } = parsed.data;

    // If setting as default, unset existing defaults first
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.savedAddress.create({
      data: {
        ...data,
        userId: session.user.id,
        isDefault: isDefault ?? false,
      },
    });

    return success(address, { status: 201 });
  } catch (err) {
    console.error("POST /api/addresses error:", err);
    return serverError();
  }
}

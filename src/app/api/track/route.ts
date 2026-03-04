import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_EVENTS = [
  "page_view",
  "view_item",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "purchase",
  "search",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      event,
      url,
      pageTitle,
      productId,
      productName,
      category,
      value,
      sessionId,
      userId,
      referrer,
      metadata,
    } = body;

    // Validate required fields
    if (!event || !sessionId) {
      return NextResponse.json(
        { error: "event and sessionId are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Read userAgent from request headers
    const userAgent = req.headers.get("user-agent") || undefined;

    await prisma.analyticsEvent.create({
      data: {
        event,
        url: url || undefined,
        pageTitle: pageTitle || undefined,
        productId: productId || undefined,
        productName: productName || undefined,
        category: category || undefined,
        value: value != null ? Number(value) : undefined,
        sessionId,
        userId: userId || undefined,
        userAgent,
        referrer: referrer || undefined,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("Track error:", err);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

// Allow preflight CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

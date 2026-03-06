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

/* ══════════════════════════════════════════════════════════════════════
   Write buffer — batches INSERTs so we do 1 DB write per flush
   instead of 1 per request. Flushes every 5 seconds or at 50 events.
   ══════════════════════════════════════════════════════════════════════ */
interface QueuedEvent {
  event: string;
  url?: string;
  pageTitle?: string;
  productId?: string;
  productName?: string;
  category?: string;
  value?: number;
  sessionId: string;
  userId?: string;
  userAgent?: string;
  referrer?: string;
  metadata?: string;
}

let buffer: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000; // 5 seconds
const FLUSH_SIZE = 50;       // or 50 events, whichever comes first

async function flushBuffer() {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0); // grab & clear
  try {
    await prisma.analyticsEvent.createMany({ data: batch });
  } catch (err) {
    console.error("Analytics flush error:", err);
    // Don't re-queue — analytics data loss is acceptable vs. memory leak
  }
}

function enqueue(event: QueuedEvent) {
  buffer.push(event);
  if (buffer.length >= FLUSH_SIZE) {
    flushBuffer();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushBuffer();
    }, FLUSH_INTERVAL);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Simple in-memory rate limiter — 20 events per IP per 10 seconds.
   Prevents bot spam without adding Redis dependency.
   ══════════════════════════════════════════════════════════════════════ */
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_WINDOW = 10_000; // 10 seconds
const RATE_LIMIT = 20;      // max events per window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

// Periodic cleanup of stale rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now >= entry.reset) rateLimitMap.delete(ip);
  }
}, 30_000);

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429 }
      );
    }

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

    // Enqueue instead of await — returns instantly
    enqueue({
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

// Preflight CORS is handled by the middleware for all /api/* routes

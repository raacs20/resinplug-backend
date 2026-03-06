import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { trackLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const ALLOWED_EVENTS = [
  "page_view",
  "view_item",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "purchase",
  "search",
] as const;

const trackSchema = z.object({
  event: z.enum(ALLOWED_EVENTS, { errorMap: () => ({ message: "Invalid event type" }) }),
  url: z.string().max(2048).optional(),
  pageTitle: z.string().max(512).optional(),
  productId: z.string().max(255).optional(),
  productName: z.string().max(512).optional(),
  category: z.string().max(255).optional(),
  value: z.number().optional(),
  sessionId: z.string().min(1, "sessionId is required").max(255),
  userId: z.string().max(255).optional(),
  referrer: z.string().max(2048).optional(),
  metadata: z.record(z.unknown()).optional(),
});

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

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP (Redis-backed)
    const { limited } = await checkRateLimit(trackLimiter, getClientIp(req));
    if (limited) {
      return badRequest("Too many requests");
    }

    const body = await req.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
    }

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
    } = parsed.data;

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

    return success({ ok: true });
  } catch (err) {
    console.error("Track error:", err);
    return serverError();
  }
}

// Preflight CORS is handled by the middleware for all /api/* routes

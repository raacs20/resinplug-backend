import { NextRequest } from "next/server";
import { createHash } from "crypto";
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
  // Analytics v2 fields from frontend
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  viewport: z.string().max(32).optional(),
  language: z.string().max(32).optional(),
  timezone: z.string().max(64).optional(),
});

/* ══════════════════════════════════════════════════════════════════════
   IP Hashing — privacy-safe visitor deduplication
   ══════════════════════════════════════════════════════════════════════ */
const IP_HASH_SALT = process.env.IP_HASH_SALT || "default_analytics_salt";

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + IP_HASH_SALT).digest("hex");
}

/* ══════════════════════════════════════════════════════════════════════
   User-Agent Parsing — lightweight regex, no npm dependency
   ══════════════════════════════════════════════════════════════════════ */
interface ParsedUA {
  deviceType: "mobile" | "tablet" | "desktop";
  browserName: string;
  osName: string;
}

function parseUserAgent(ua: string): ParsedUA {
  const lowerUA = ua.toLowerCase();

  // Device type
  let deviceType: "mobile" | "tablet" | "desktop" = "desktop";
  if (/ipad|tablet|playbook|silk|kindle/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = "mobile";
  }

  // Browser name (order matters — check specific before generic)
  let browserName = "Other";
  if (lowerUA.includes("edg/") || lowerUA.includes("edge/")) browserName = "Edge";
  else if (lowerUA.includes("opr/") || lowerUA.includes("opera")) browserName = "Opera";
  else if (lowerUA.includes("brave")) browserName = "Brave";
  else if (lowerUA.includes("firefox/") || lowerUA.includes("fxios/")) browserName = "Firefox";
  else if (lowerUA.includes("crios/")) browserName = "Chrome";
  else if (lowerUA.includes("safari/") && !lowerUA.includes("chrome/")) browserName = "Safari";
  else if (lowerUA.includes("chrome/")) browserName = "Chrome";
  else if (lowerUA.includes("msie") || lowerUA.includes("trident/")) browserName = "IE";

  // OS name
  let osName = "Other";
  if (/windows/i.test(ua)) osName = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) osName = "iOS";
  else if (/mac os|macintosh/i.test(ua)) osName = "macOS";
  else if (/android/i.test(ua)) osName = "Android";
  else if (/linux/i.test(ua)) osName = "Linux";
  else if (/cros/i.test(ua)) osName = "ChromeOS";

  return { deviceType, browserName, osName };
}

/* ══════════════════════════════════════════════════════════════════════
   Source Resolution — UTM > referrer domain mapping > "Direct"
   ══════════════════════════════════════════════════════════════════════ */
const SOURCE_MAP: Record<string, string> = {
  "google.com": "Google", "www.google.com": "Google", "google.ca": "Google", "www.google.ca": "Google",
  "bing.com": "Bing", "www.bing.com": "Bing",
  "facebook.com": "Facebook", "www.facebook.com": "Facebook", "m.facebook.com": "Facebook",
  "l.facebook.com": "Facebook", "lm.facebook.com": "Facebook",
  "instagram.com": "Instagram", "www.instagram.com": "Instagram", "l.instagram.com": "Instagram",
  "twitter.com": "X (Twitter)", "www.twitter.com": "X (Twitter)", "t.co": "X (Twitter)",
  "x.com": "X (Twitter)", "www.x.com": "X (Twitter)",
  "tiktok.com": "TikTok", "www.tiktok.com": "TikTok",
  "youtube.com": "YouTube", "www.youtube.com": "YouTube", "m.youtube.com": "YouTube",
  "reddit.com": "Reddit", "www.reddit.com": "Reddit", "old.reddit.com": "Reddit",
  "duckduckgo.com": "DuckDuckGo", "www.duckduckgo.com": "DuckDuckGo",
  "pinterest.com": "Pinterest", "www.pinterest.com": "Pinterest",
  "linkedin.com": "LinkedIn", "www.linkedin.com": "LinkedIn",
};

const INTERNAL_DOMAINS = ["localhost", "127.0.0.1", "resinplug"];

function resolveSource(utmSource?: string, referrer?: string): string {
  // Priority 1: UTM source
  if (utmSource) return utmSource;

  // Priority 2: Referrer domain mapping
  if (referrer) {
    try {
      const domain = new URL(referrer).hostname.toLowerCase();
      // Skip internal referrers
      if (INTERNAL_DOMAINS.some((d) => domain.includes(d))) return "Direct";
      if (SOURCE_MAP[domain]) return SOURCE_MAP[domain];
      return domain; // Unknown external referrer — use domain as source
    } catch {
      // Invalid URL
    }
  }

  // Priority 3: Direct
  return "Direct";
}

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
  // Analytics v2
  ipHash?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  deviceType?: string;
  browserName?: string;
  osName?: string;
  viewport?: string;
  language?: string;
  timezone?: string;
  source?: string;
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
    const ip = getClientIp(req);
    const { limited } = await checkRateLimit(trackLimiter, ip);
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
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      viewport,
      language,
      timezone,
    } = parsed.data;

    // Read userAgent from request headers
    const userAgent = req.headers.get("user-agent") || undefined;

    // IP hash for privacy-safe dedup
    const ipHash = hashIp(ip);

    // Parse User-Agent for device/browser/OS
    const ua = userAgent ? parseUserAgent(userAgent) : undefined;

    // Resolve traffic source
    const source = resolveSource(utmSource, referrer);

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
      // Analytics v2
      ipHash,
      utmSource: utmSource || undefined,
      utmMedium: utmMedium || undefined,
      utmCampaign: utmCampaign || undefined,
      utmContent: utmContent || undefined,
      utmTerm: utmTerm || undefined,
      deviceType: ua?.deviceType,
      browserName: ua?.browserName,
      osName: ua?.osName,
      viewport: viewport || undefined,
      language: language || undefined,
      timezone: timezone || undefined,
      source,
    });

    return success({ ok: true });
  } catch (err) {
    console.error("Track error:", err);
    return serverError();
  }
}

// Preflight CORS is handled by the middleware for all /api/* routes

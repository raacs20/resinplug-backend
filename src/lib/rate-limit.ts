import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* ── In-memory fallback when Redis is unavailable ── */
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now >= entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * In-memory rate limit check. Returns { limited, reset } just like Upstash.
 * Uses a fixed window per identifier.
 */
function memoryRateLimit(
  prefix: string,
  identifier: string,
  maxRequests: number,
  windowMs: number
): { limited: boolean; reset: number } {
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetTime) {
    // Start a new window
    memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return { limited: false, reset: now + windowMs };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { limited: true, reset: entry.resetTime };
  }
  return { limited: false, reset: entry.resetTime };
}

/* ── Parse window string (e.g. "15 m", "1 h", "10 s") to milliseconds ── */
function windowToMs(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 60 * 1000; // fallback: 1 minute
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}

/* ── Detect whether Upstash Redis is configured ── */
const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

/* ── Upstash Redis connection (only when env vars are present) ── */
const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

if (!hasRedis) {
  console.warn(
    "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — using in-memory rate limiting"
  );
}

/* ── Limiter wrapper that holds both Upstash + fallback config ── */
export interface RateLimiterConfig {
  upstash: Ratelimit | null;
  prefix: string;
  maxRequests: number;
  windowMs: number;
}

function createLimiter(
  prefix: string,
  requests: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1]
): RateLimiterConfig {
  const upstash =
    redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(requests, window),
          prefix: `ratelimit:${prefix}`,
          analytics: true,
        })
      : null;

  return {
    upstash,
    prefix,
    maxRequests: requests,
    windowMs: windowToMs(window),
  };
}

/* ── Pre-configured limiters ── */
export const loginLimiter = createLimiter("login", 5, "15 m");
export const registerLimiter = createLimiter("register", 3, "1 h");
export const adminLoginLimiter = createLimiter("admin-login", 5, "15 m");
export const trackLimiter = createLimiter("track", 20, "10 s");
export const reviewVoteLimiter = createLimiter("review-vote", 1, "1 h");
export const forgotPasswordLimiter = createLimiter("forgot-pw", 3, "1 h");
export const orderLimiter = createLimiter("order", 10, "1 h");
export const couponValidateLimiter = createLimiter("coupon-validate", 10, "1 m");

/* ── IP extraction helper ── */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/* ── Graceful rate limit check with in-memory fallback ── */
export async function checkRateLimit(
  limiter: RateLimiterConfig,
  identifier: string
): Promise<{ limited: boolean; reset?: number }> {
  // Try Upstash first
  if (limiter.upstash) {
    try {
      const result = await limiter.upstash.limit(identifier);
      return { limited: !result.success, reset: result.reset };
    } catch (err) {
      console.error("Redis rate limit check failed, falling back to in-memory:", err);
      // Fall through to in-memory
    }
  }

  // In-memory fallback (always used when Redis is unavailable or errored)
  const result = memoryRateLimit(
    limiter.prefix,
    identifier,
    limiter.maxRequests,
    limiter.windowMs
  );
  return result;
}

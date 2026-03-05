import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/* ── Rate limiting for credential login: 5 attempts per IP per 15 minutes ── */
const loginRateLimitMap = new Map<string, { count: number; reset: number }>();
const LOGIN_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes
const LOGIN_RATE_LIMIT = 5;

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginRateLimitMap.get(ip);
  if (!entry || now >= entry.reset) {
    loginRateLimitMap.set(ip, { count: 1, reset: now + LOGIN_RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > LOGIN_RATE_LIMIT;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginRateLimitMap) {
    if (now >= entry.reset) loginRateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  // Only rate limit credential sign-in (not signout, session refresh, etc.)
  const pathname = request.nextUrl.pathname;

  if (pathname.endsWith("/callback/credentials")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isLoginRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429 }
      );
    }
  }

  return handlers.POST(request);
}

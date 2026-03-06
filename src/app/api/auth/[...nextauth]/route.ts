import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { loginLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  try {
    // Only rate limit credential sign-in (not signout, session refresh, etc.)
    const pathname = request.nextUrl.pathname;

    if (pathname.endsWith("/callback/credentials")) {
      const { limited } = await checkRateLimit(loginLimiter, getClientIp(request));
      if (limited) {
        return NextResponse.json(
          { error: "Too many login attempts. Try again later." },
          { status: 429 }
        );
      }
    }

    return handlers.POST(request);
  } catch (err) {
    console.error("Auth POST error:", err);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }
}

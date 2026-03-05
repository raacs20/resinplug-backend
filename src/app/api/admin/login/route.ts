import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { encode } from "next-auth/jwt";

/* ── Rate limiting: 5 attempts per IP per 15 minutes ── */
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

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isLoginRateLimited(ip)) {
      return NextResponse.json(
        { error: { message: "Too many login attempts. Try again later." } },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: "Email and password are required" } },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: { message: "Invalid credentials" } },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: { message: "Invalid credentials" } },
        { status: 401 }
      );
    }

    // Check admin role
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { message: "Admin access required" } },
        { status: 403 }
      );
    }

    // Create JWT token (same format as NextAuth)
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: { message: "Server configuration error" } },
        { status: 500 }
      );
    }

    // Must match the cookie names in auth.ts NextAuth config
    const secureCookieName = "__Secure-next-auth.session-token";
    const plainCookieName = "next-auth.session-token";
    const isProduction = process.env.NODE_ENV === "production";
    const salt = isProduction ? secureCookieName : plainCookieName;

    const token = await encode({
      token: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sub: user.id,
      },
      secret,
      salt,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set the session cookie (must match auth.ts cookie config)
    const response = NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Cookie options must match auth.ts — sameSite:"none" in production for cross-origin
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    };

    response.cookies.set("next-auth.session-token", token, cookieOptions);
    // Also set the __Secure- prefixed version for production HTTPS
    if (isProduction) {
      response.cookies.set("__Secure-next-auth.session-token", token, cookieOptions);
    }

    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

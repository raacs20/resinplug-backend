import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const adminUrl = process.env.ADMIN_URL || "";
  const allowedOrigins = [
    frontendUrl,
    // Also allow 127.0.0.1 variant for local dev
    frontendUrl.replace("localhost", "127.0.0.1"),
    // Admin dashboard (from env)
    adminUrl,
    adminUrl ? adminUrl.replace("localhost", "127.0.0.1") : "",
  ].filter(Boolean);

  const origin = request.headers.get("origin") ?? "";

  // In production, require a valid Origin header. In dev, allow missing origin (curl, Postman).
  const isAllowed = allowedOrigins.includes(origin) || (!isProduction && !origin);

  // Security headers applied to all API responses
  const securityHeaders: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
  if (isProduction) {
    securityHeaders["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }

  // Handle preflight OPTIONS
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowed ? origin : "",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
        ...securityHeaders,
      },
    });
  }

  const response = NextResponse.next();

  // Set security headers on all responses
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  if (isAllowed && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};

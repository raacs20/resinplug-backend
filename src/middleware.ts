import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only apply CORS to API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const allowedOrigins = [
    frontendUrl,
    // Also allow 127.0.0.1 variant for local dev
    frontendUrl.replace("localhost", "127.0.0.1"),
    // Production frontend
    "https://resinplug-production.up.railway.app",
    // Admin dashboard (local dev)
    "http://localhost:3002",
    "http://127.0.0.1:3002",
  ].filter(Boolean);

  const origin = request.headers.get("origin") ?? "";
  const isAllowed = allowedOrigins.includes(origin) || !origin;

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
      },
    });
  }

  const response = NextResponse.next();

  if (isAllowed) {
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

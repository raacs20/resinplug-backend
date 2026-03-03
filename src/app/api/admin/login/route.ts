import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { encode } from "next-auth/jwt";

export async function POST(request: NextRequest) {
  try {
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

    // Set cookie - try both cookie names for compatibility
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    };

    response.cookies.set("next-auth.session-token", token, cookieOptions);
    // Also set the __Secure- prefixed version for production HTTPS
    if (process.env.NODE_ENV === "production") {
      response.cookies.set("__Secure-next-auth.session-token", token, {
        ...cookieOptions,
        secure: true,
      });
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

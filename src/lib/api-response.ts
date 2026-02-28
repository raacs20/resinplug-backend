import { NextResponse } from "next/server";

interface SuccessOptions {
  status?: number;
  meta?: Record<string, unknown>;
}

export function success(data: unknown, options: SuccessOptions = {}) {
  const { status = 200, meta } = options;
  const body: Record<string, unknown> = { data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function error(
  code: string,
  message: string,
  status: number = 400
) {
  return NextResponse.json(
    { error: { code, message } },
    { status }
  );
}

export function notFound(message = "Resource not found") {
  return error("NOT_FOUND", message, 404);
}

export function badRequest(message: string) {
  return error("BAD_REQUEST", message, 400);
}

export function serverError(message = "Internal server error") {
  return error("SERVER_ERROR", message, 500);
}

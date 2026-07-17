import { NextResponse, type NextRequest } from "next/server";

export function requestActor(request: NextRequest): string {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return "authenticated-user";
  try { return Buffer.from(header.slice(6), "base64").toString("utf8").split(":", 1)[0] || "authenticated-user"; }
  catch { return "authenticated-user"; }
}

export function clientAddress(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function apiError(error: unknown, fallbackCode = "REQUEST_FAILED", status = 400): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  const separator = message.indexOf(":");
  const code = separator > 0 && /^[A-Z_]+$/.test(message.slice(0, separator)) ? message.slice(0, separator) : fallbackCode;
  const safeMessage = separator > 0 && code !== fallbackCode ? message.slice(separator + 1).trim() : message;
  return NextResponse.json({ error: { code, message: safeMessage, details: {} } }, { status });
}


import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function proxy(request: NextRequest): NextResponse {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      { error: { code: "ADMIN_DISABLED", message: "Admin credentials are not configured." } },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const [username, password] = Buffer.from(header.slice(6), "base64").toString("utf8").split(":", 2);
      if (safeEqual(username ?? "", expectedUsername) && safeEqual(password ?? "", expectedPassword)) {
        return NextResponse.next();
      }
    } catch {
      // Fall through to the uniform challenge response.
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Origin Graph Admin", charset="UTF-8"' }
  });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

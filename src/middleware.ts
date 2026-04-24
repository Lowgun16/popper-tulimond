import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "./lib/session";

export async function middleware(request: NextRequest) {
  const studioEnabled = process.env.NEXT_PUBLIC_STUDIO_ENABLED === "true";
  const { pathname } = request.nextUrl;

  // Block /studio/* when studio is disabled
  if (!studioEnabled && pathname.startsWith("/studio")) {
    return new NextResponse(null, { status: 404 });
  }

  // Protect /admin/* API routes (not /admin/setup or /admin/recover — those are public)
  if (
    pathname.startsWith("/api/admin/") ||
    (pathname.startsWith("/admin/") &&
      !pathname.startsWith("/admin/setup") &&
      !pathname.startsWith("/admin/recover"))
  ) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/admin/:path*", "/api/admin/:path*"],
};

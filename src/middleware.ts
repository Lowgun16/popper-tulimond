import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const studioEnabled = process.env.STUDIO_ENABLED === "true";

  if (!studioEnabled && request.nextUrl.pathname.startsWith("/studio")) {
    return NextResponse.notFound();
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/studio/:path*",
};

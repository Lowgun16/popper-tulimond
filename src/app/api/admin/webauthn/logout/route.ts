import { NextResponse } from "next/server";
import { buildClearSessionCookieHeader } from "@/lib/adminAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildClearSessionCookieHeader());
  return response;
}

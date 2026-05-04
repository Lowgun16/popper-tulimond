import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyMemberSession,
  signMemberSession,
  MEMBER_SESSION_COOKIE,
  MEMBER_SESSION_MAX_AGE,
  type MemberSessionPayload,
} from "./memberSession";

export async function getMemberSession(): Promise<MemberSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyMemberSession(token);
}

export async function requireMemberSession(
  req: NextRequest
): Promise<MemberSessionPayload | NextResponse> {
  const token = req.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyMemberSession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

export function buildMemberSessionCookieHeader(token: string): string {
  return `${MEMBER_SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MEMBER_SESSION_MAX_AGE}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export function buildClearMemberSessionCookieHeader(): string {
  return `${MEMBER_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

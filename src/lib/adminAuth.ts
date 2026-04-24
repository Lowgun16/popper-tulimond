import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, signSession, SESSION_MAX_AGE, type SessionPayload } from "./session";

/** Read and verify the session from the cookie store (server components / API routes). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Use in API routes: returns session or responds 401. */
export async function requireSession(req: NextRequest): Promise<SessionPayload | NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

/** Use in owner-only API routes: returns session or responds 401/403. */
export async function requireOwner(req: NextRequest): Promise<SessionPayload | NextResponse> {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
  if (sessionOrResponse.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return sessionOrResponse;
}

/** Build a Set-Cookie response header value for the session. */
export function buildSessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

/** Build a cookie header that clears the session. */
export function buildClearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

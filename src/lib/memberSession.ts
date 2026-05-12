import { SignJWT, jwtVerify } from "jose";

export const MEMBER_SESSION_COOKIE = "member_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export type MemberSessionPayload = { memberId: string };

export async function signMemberSession(payload: MemberSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyMemberSession(token: string): Promise<MemberSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { memberId: payload.memberId as string };
  } catch {
    return null;
  }
}

export { SESSION_MAX_AGE as MEMBER_SESSION_MAX_AGE };

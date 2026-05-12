import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export const ADD_CRED_CHALLENGE_COOKIE = "webauthn_add_challenge";

export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const [userRows, credRows] = await Promise.all([
    sql`SELECT name, email FROM admin_users WHERE id = ${sessionOrResponse.userId}`,
    sql`SELECT credential_id FROM webauthn_credentials WHERE user_id = ${sessionOrResponse.userId}`,
  ]);

  if (userRows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const options = await generateRegistrationOptions({
    rpName: process.env.WEBAUTHN_RP_NAME!,
    rpID: process.env.WEBAUTHN_RP_ID!,
    userName: userRows[0].email,
    userDisplayName: userRows[0].name,
    attestationType: "none",
    excludeCredentials: credRows.map((r: { credential_id: string }) => ({
      id: r.credential_id,
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const response = NextResponse.json(options);
  response.headers.set(
    "Set-Cookie",
    `${ADD_CRED_CHALLENGE_COOKIE}=${options.challenge}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return response;
}

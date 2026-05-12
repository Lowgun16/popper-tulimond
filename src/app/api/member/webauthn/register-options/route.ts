import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";

export const REG_CHALLENGE_COOKIE = "member_reg_challenge";

export async function POST(req: NextRequest) {
  const { setupToken } = await req.json() as { setupToken: string };

  const rows = await sql`
    SELECT id, phone, name FROM members
    WHERE setup_token = ${setupToken}
      AND setup_token_expires_at > now()
      AND passkey_registered = false
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired setup link" }, { status: 400 });
  }

  const member = rows[0];

  const options = await generateRegistrationOptions({
    rpName: process.env.WEBAUTHN_RP_NAME!,
    rpID: process.env.WEBAUTHN_RP_ID!,
    userName: member.phone,
    userDisplayName: member.name ?? member.phone,
    attestationType: "none",
    authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
  });

  const response = NextResponse.json(options);
  response.headers.set(
    "Set-Cookie",
    `${REG_CHALLENGE_COOKIE}=${options.challenge}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";

export const REG_CHALLENGE_COOKIE = "webauthn_reg_challenge";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const name = req.nextUrl.searchParams.get("name");
  if (!email || !name) {
    return NextResponse.json({ error: "email and name are required" }, { status: 400 });
  }

  const existingRows = await sql`
    SELECT wc.credential_id
    FROM webauthn_credentials wc
    JOIN admin_users au ON au.id = wc.user_id
    WHERE au.email = ${email}
  `;
  const excludeCredentials = existingRows.map((r: { credential_id: string }) => ({
    id: r.credential_id,
    type: "public-key" as const,
  }));

  const options = await generateRegistrationOptions({
    rpName: process.env.WEBAUTHN_RP_NAME!,
    rpID: process.env.WEBAUTHN_RP_ID!,
    userName: email,
    userDisplayName: name,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const response = NextResponse.json(options);
  response.headers.set(
    "Set-Cookie",
    `${REG_CHALLENGE_COOKIE}=${options.challenge}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return response;
}

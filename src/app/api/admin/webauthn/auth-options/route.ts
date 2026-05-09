import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";

export const CHALLENGE_COOKIE = "webauthn_auth_challenge";

export async function GET() {
  // Pass all registered admin credential IDs so the browser skips the
  // "choose an account" picker and goes straight to biometric verification.
  const credRows = await sql`
    SELECT wc.credential_id
    FROM webauthn_credentials wc
    JOIN admin_users au ON au.id = wc.user_id
    WHERE au.active = true
  `;

  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RP_ID!,
    userVerification: "preferred",
    allowCredentials: credRows.map((r: { credential_id: string }) => ({
      id: r.credential_id,
      type: "public-key" as const,
    })),
  });

  const response = NextResponse.json(options);
  response.headers.set(
    "Set-Cookie",
    `${CHALLENGE_COOKIE}=${options.challenge}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return response;
}

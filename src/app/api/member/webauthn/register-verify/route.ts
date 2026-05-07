import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sql } from "@/lib/db";
import { REG_CHALLENGE_COOKIE } from "../register-options/route";
import { signMemberSession } from "@/lib/memberSession";
import { buildMemberSessionCookieHeader } from "@/lib/memberAuth";

export async function POST(req: NextRequest) {
  const { setupToken, registrationResponse } = await req.json();

  const expectedChallenge = req.cookies.get(REG_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "No challenge — start registration again" }, { status: 400 });
  }

  const rows = await sql`
    SELECT id FROM members
    WHERE setup_token = ${setupToken}
      AND setup_token_expires_at > now()
      AND passkey_registered = false
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired setup link" }, { status: 400 });
  }

  const memberId = rows[0].id;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.WEBAUTHN_RP_ID!,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const credentialId = credential.id; // already a Base64URLString — store directly
  const publicKey = isoBase64URL.fromBuffer(credential.publicKey); // Uint8Array → string

  await sql`
    INSERT INTO member_webauthn_credentials (member_id, credential_id, public_key, counter)
    VALUES (${memberId}, ${credentialId}, ${publicKey}, ${credential.counter})
    ON CONFLICT (credential_id) DO NOTHING
  `;

  await sql`
    UPDATE members
    SET passkey_registered = true,
        member_since = now(),
        setup_token = NULL,
        setup_token_expires_at = NULL
    WHERE id = ${memberId}
  `;

  // Backfill member_id on their order
  await sql`
    UPDATE orders SET member_id = ${memberId}
    WHERE phone = (SELECT phone FROM members WHERE id = ${memberId})
      AND member_id IS NULL
  `;

  const token = await signMemberSession({ memberId });
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildMemberSessionCookieHeader(token));
  response.headers.append("Set-Cookie", `${REG_CHALLENGE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return response;
}

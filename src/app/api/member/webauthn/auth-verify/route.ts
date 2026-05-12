import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sql } from "@/lib/db";
import { AUTH_CHALLENGE_COOKIE } from "../auth-options/route";
import { signMemberSession } from "@/lib/memberSession";
import { buildMemberSessionCookieHeader } from "@/lib/memberAuth";

export async function POST(req: NextRequest) {
  const { authenticationResponse } = await req.json();

  const expectedChallenge = req.cookies.get(AUTH_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge not found — try again" }, { status: 400 });
  }

  const credentialId = authenticationResponse.id;

  const rows = await sql`
    SELECT mwc.id, mwc.credential_id, mwc.public_key, mwc.counter,
           m.id as member_id
    FROM member_webauthn_credentials mwc
    JOIN members m ON m.id = mwc.member_id
    WHERE mwc.credential_id = ${credentialId}
      AND m.passkey_registered = true
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Credential not found" }, { status: 401 });
  }

  const cred = rows[0];

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.WEBAUTHN_RP_ID!,
      credential: {
        id: cred.credential_id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: cred.counter,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  await sql`
    UPDATE member_webauthn_credentials
    SET counter = ${verification.authenticationInfo.newCounter}
    WHERE credential_id = ${credentialId}
  `;

  const token = await signMemberSession({ memberId: cred.member_id });
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildMemberSessionCookieHeader(token));
  response.headers.append("Set-Cookie", `${AUTH_CHALLENGE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return response;
}

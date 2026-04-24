import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sql } from "@/lib/db";
import { authChallengeStore } from "../auth-options/route";
import { signSession } from "@/lib/session";
import { buildSessionCookieHeader } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { authenticationResponse } = body as { authenticationResponse: { id: string; response: { clientDataJSON: string } } };

  // Decode challenge from clientDataJSON
  const clientData = JSON.parse(
    Buffer.from(authenticationResponse.response.clientDataJSON, "base64url").toString()
  );
  const challenge = clientData.challenge;
  const expectedChallenge = authChallengeStore.get(challenge);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
  }

  const credentialId = authenticationResponse.id;

  // Look up the credential
  const credRows = await sql`
    SELECT wc.id, wc.credential_id, wc.public_key, wc.counter,
           au.id as user_id, au.role
    FROM webauthn_credentials wc
    JOIN admin_users au ON au.id = wc.user_id
    WHERE wc.credential_id = ${credentialId}
      AND au.active = true
  `;

  if (credRows.length === 0) {
    return NextResponse.json({ error: "Credential not found" }, { status: 401 });
  }

  const cred = credRows[0];

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: authenticationResponse as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
      expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.WEBAUTHN_RP_ID!,
      credential: {
        // @ts-expect-error — @simplewebauthn/server type mismatch: toBuffer returns Uint8Array, library expects string
        id: isoBase64URL.toBuffer(cred.credential_id),
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

  authChallengeStore.delete(challenge);

  // Update counter
  await sql`
    UPDATE webauthn_credentials
    SET counter = ${verification.authenticationInfo.newCounter}
    WHERE credential_id = ${credentialId}
  `;

  const token = await signSession({ userId: cred.user_id, role: cred.role });
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildSessionCookieHeader(token));
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { requireSession } from "@/lib/adminAuth";
import { sql } from "@/lib/db";
import { ADD_CRED_CHALLENGE_COOKIE } from "../add-credential-options/route";

export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const expectedChallenge = req.cookies.get(ADD_CRED_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "No challenge found — start registration again" }, { status: 400 });
  }

  const { registrationResponse, deviceName } = await req.json() as {
    registrationResponse: unknown;
    deviceName?: string;
  };

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: registrationResponse as Parameters<typeof verifyRegistrationResponse>[0]["response"],
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
  const credentialId = credential.id;
  const publicKey = isoBase64URL.fromBuffer(credential.publicKey);

  await sql`
    INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_name)
    VALUES (
      ${sessionOrResponse.userId},
      ${credentialId},
      ${publicKey},
      ${credential.counter},
      ${deviceName ?? null}
    )
    ON CONFLICT (credential_id) DO NOTHING
  `;

  const response = NextResponse.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${ADD_CRED_CHALLENGE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sql } from "@/lib/db";
import { challengeStore } from "../register-options/route";
import { signSession } from "@/lib/session";
import { buildSessionCookieHeader } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, name, role, registrationResponse, inviteToken } = body as {
    email: string;
    name: string;
    role?: "owner" | "editor";
    registrationResponse: unknown;
    inviteToken?: string;
  };

  const expectedChallenge = challengeStore.get(email);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "No challenge found — start registration again" }, { status: 400 });
  }

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

  challengeStore.delete(email);

  const { credential } = verification.registrationInfo;
  const credentialId = isoBase64URL.fromBuffer(credential.id);
  const publicKey = isoBase64URL.fromBuffer(credential.publicKey);

  // Check if this is the very first admin (setup flow) or an invite flow
  const existingAdmins = await sql`SELECT id FROM admin_users LIMIT 1`;
  const isFirstAdmin = existingAdmins.length === 0;

  // Validate invite token if not first admin
  if (!isFirstAdmin && inviteToken) {
    const invite = await sql`
      SELECT id FROM admin_invites
      WHERE token = ${inviteToken}
        AND used = false
        AND expires_at > now()
    `;
    if (invite.length === 0) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
    }
    await sql`UPDATE admin_invites SET used = true WHERE token = ${inviteToken}`;
  }

  const assignedRole = isFirstAdmin ? "owner" : (role ?? "editor");

  // Upsert user
  const userResult = await sql`
    INSERT INTO admin_users (name, email, role)
    VALUES (${name}, ${email}, ${assignedRole})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const userId = userResult[0].id;

  // Save credential
  await sql`
    INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
    VALUES (${userId}, ${credentialId}, ${publicKey}, ${credential.counter})
    ON CONFLICT (credential_id) DO NOTHING
  `;

  // Generate recovery code for first admin (owner)
  let recoveryCode: string | null = null;
  if (isFirstAdmin) {
    recoveryCode = crypto.randomBytes(16).toString("hex");
    const codeHash = await bcrypt.hash(recoveryCode, 12);
    await sql`
      INSERT INTO admin_recovery (user_id, code_hash)
      VALUES (${userId}, ${codeHash})
    `;
  }

  // Issue session
  const token = await signSession({ userId, role: assignedRole });
  const response = NextResponse.json({ ok: true, recoveryCode });
  response.headers.set("Set-Cookie", buildSessionCookieHeader(token));
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";

// In-memory challenge store (sufficient for single-server; Vercel Fluid Compute reuses instances)
const challengeStore = new Map<string, string>();

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const name = req.nextUrl.searchParams.get("name");
  if (!email || !name) {
    return NextResponse.json({ error: "email and name are required" }, { status: 400 });
  }

  // Fetch existing credentials for this user (if any) to exclude them
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

  challengeStore.set(email, options.challenge);

  return NextResponse.json(options);
}

export { challengeStore };

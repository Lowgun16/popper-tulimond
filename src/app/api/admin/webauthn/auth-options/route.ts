import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

// Shared challenge store for auth flow
export const authChallengeStore = new Map<string, string>();

export async function GET() {
  // Allow any registered credential (passkey-style: user selects their device)
  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RP_ID!,
    userVerification: "preferred",
    allowCredentials: [],
  });

  // Store challenge keyed by challenge string itself (resolved in verify)
  authChallengeStore.set(options.challenge, options.challenge);

  return NextResponse.json(options);
}

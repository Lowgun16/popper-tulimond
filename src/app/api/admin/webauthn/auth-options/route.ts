import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

export const CHALLENGE_COOKIE = "webauthn_auth_challenge";

export async function GET() {
  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RP_ID!,
    userVerification: "preferred",
    allowCredentials: [],
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

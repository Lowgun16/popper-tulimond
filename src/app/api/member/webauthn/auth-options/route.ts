import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

export const AUTH_CHALLENGE_COOKIE = "member_auth_challenge";

export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RP_ID!,
    userVerification: "required",
  });

  const response = NextResponse.json(options);
  response.headers.set(
    "Set-Cookie",
    `${AUTH_CHALLENGE_COOKIE}=${options.challenge}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return response;
}

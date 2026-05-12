import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const { phone } = await req.json() as { phone: string };
  if (!phone?.trim()) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  const rows = await sql`
    SELECT id, setup_token, setup_token_expires_at, passkey_registered
    FROM members WHERE phone = ${phone.trim()}
  `;

  if (rows.length === 0) {
    // Don't reveal whether phone exists
    return NextResponse.json({ ok: true });
  }

  const member = rows[0];

  // Generate a new setup token (re-register passkey on new device)
  const newToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    UPDATE members
    SET setup_token = ${newToken}, setup_token_expires_at = ${expiresAt}
    WHERE id = ${member.id}
  `;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://poppertulimond.com";
  const setupUrl = `${baseUrl}/membership-setup?token=${newToken}`;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: `Set up your Popper Tulimond membership on this device: ${setupUrl}`,
        from: fromNumber,
        to: phone.trim(),
      });
    } catch (err) {
      console.error("[login-link] Twilio error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

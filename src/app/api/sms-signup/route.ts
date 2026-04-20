// src/app/api/sms-signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  let body: { phone?: unknown; email?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { phone, email, source } = body;

  // Validate phone
  if (typeof phone !== "string" || phone.trim().length < 7) {
    return NextResponse.json(
      { ok: false, error: "Valid phone number required" },
      { status: 400 }
    );
  }

  // Validate source
  if (source !== "protocol_cta" && source !== "blocked_purchase") {
    return NextResponse.json(
      { ok: false, error: "Invalid source" },
      { status: 400 }
    );
  }

  const cleanPhone = phone.trim();
  const cleanEmail = typeof email === "string" && email.trim().length > 0
    ? email.trim()
    : null;

  // Save to DB
  try {
    await sql`
      INSERT INTO sms_signups (phone, email, source)
      VALUES (${cleanPhone}, ${cleanEmail}, ${source})
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  // Send welcome SMS via Twilio (non-blocking — if Twilio fails, signup is still saved)
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: "You're in. Text CONSTABLE when we send you the number on the 16th. — Popper Tulimond",
        from: fromNumber,
        to: cleanPhone,
      });
    } catch (twilioErr) {
      // Log but don't fail the request — signup is already saved
      console.error("[sms-signup] Twilio error:", twilioErr);
    }
  }

  return NextResponse.json({ ok: true });
}

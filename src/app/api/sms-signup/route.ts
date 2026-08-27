// src/app/api/sms-signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  let body: { firstName?: unknown; phone?: unknown; email?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { firstName, phone, email, source } = body;

  if (typeof firstName !== "string" || firstName.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "First name required" }, { status: 400 });
  }

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
      INSERT INTO sms_signups (phone, email, name, source)
      VALUES (${cleanPhone}, ${cleanEmail}, ${firstName.trim()}, ${source})
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  // Send welcome SMS via Twilio (non-blocking — if Twilio fails, signup is still saved)
  await sendSms(cleanPhone, "You're in. We'll text you the moment the doors are about to open. — Popper Tulimond. Reply STOP to opt out.");

  return NextResponse.json({ ok: true });
}

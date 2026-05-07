import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

interface CartItemSummary {
  name: string;
  size: string;
  colorway?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, cartItems } = (await req.json()) as {
      name: string;
      email: string;
      phone?: string;
      cartItems: CartItemSummary[];
    };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get the active drop for context + early access link
    const drops = await sql`
      SELECT * FROM initiation_drops ORDER BY drop_month DESC LIMIT 1
    `;
    const drop = drops[0] ?? null;

    // Save intent
    await sql`
      INSERT INTO checkout_intents (name, email, phone, cart_items, drop_id)
      VALUES (
        ${name || null},
        ${email},
        ${phone || null},
        ${JSON.stringify(cartItems)},
        ${drop?.id ?? null}
      )
    `;

    // Also upsert into sms_signups if phone provided (for SMS campaigns)
    if (phone) {
      await sql`
        INSERT INTO sms_signups (phone, name, segment)
        VALUES (${phone}, ${name || null}, 'pledge')
        ON CONFLICT (phone) DO NOTHING
      `;
    }

    // Format drop date for email
    const rawDate = drop?.drop_month;
    let dropDateStr = "the 16th";
    if (rawDate) {
      const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
      dropDateStr = d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://poppertulimond.com";

    // Send confirmation email
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const itemLines = cartItems
        .map((i) => `<li style="margin-bottom:6px;color:rgba(240,232,215,0.75);font-size:14px;">${i.name}${i.colorway ? ` — ${i.colorway}` : ""} / Size ${i.size}</li>`)
        .join("");

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0e0e0e;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <p style="margin:0;font-family:Georgia,serif;font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#C4A456;">Popper Tulimond</p>
        </td></tr>

        <tr><td style="padding-bottom:24px;border-bottom:1px solid rgba(196,164,86,0.2);">
          <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:300;color:rgba(240,232,215,0.95);line-height:1.35;">
            Your place is reserved.
          </h1>
        </td></tr>

        <tr><td style="padding:28px 0 20px;">
          <p style="margin:0 0 18px;font-family:Georgia,serif;font-size:15px;color:rgba(240,232,215,0.7);line-height:1.75;">
            ${name ? `${name.split(" ")[0]}, you` : "You"} already chose your piece. That tells us everything we need to know.
          </p>
          <p style="margin:0 0 18px;font-family:Georgia,serif;font-size:15px;color:rgba(240,232,215,0.7);line-height:1.75;">
            The Vault opens to new members on <strong style="color:rgba(240,232,215,0.9);">${dropDateStr}</strong>. We'll send you early access — fifteen minutes before anyone else — so you don't miss your window.
          </p>
          <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:rgba(240,232,215,0.7);line-height:1.75;">
            The items you chose will be waiting.
          </p>
        </td></tr>

        ${cartItems.length > 0 ? `
        <tr><td style="padding:20px 0;border-top:1px solid rgba(196,164,86,0.12);border-bottom:1px solid rgba(196,164,86,0.12);">
          <p style="margin:0 0 12px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#C4A456;font-family:Georgia,serif;">Your Selection</p>
          <ul style="margin:0;padding:0 0 0 16px;">${itemLines}</ul>
        </td></tr>
        ` : ""}

        <tr><td style="padding:32px 0;">
          <a href="${baseUrl}" style="display:inline-block;padding:14px 32px;background:rgba(196,164,86,0.1);border:1px solid #C4A456;color:#C4A456;font-family:Georgia,serif;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;text-decoration:none;">
            Visit the Vault
          </a>
        </td></tr>

        <tr><td style="border-top:1px solid rgba(196,164,86,0.1);padding-top:24px;">
          <p style="margin:0;font-size:11px;color:rgba(240,232,215,0.25);line-height:1.7;font-family:Georgia,serif;">
            We build for the man who has been building for everyone else.<br>
            — Popper Tulimond
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await resend.emails.send({
        from: process.env.FROM_EMAIL ?? "orders@poppertulimond.com",
        to: email,
        subject: `Your place is reserved — Popper Tulimond`,
        html,
      });
    } catch (emailErr) {
      console.error("[checkout/reserve] Email error:", emailErr);
    }

    return NextResponse.json({ success: true, dropDate: drop?.drop_month ?? null });
  } catch (err) {
    console.error("[checkout/reserve] Error:", err);
    return NextResponse.json({ error: "Unable to save reservation" }, { status: 500 });
  }
}

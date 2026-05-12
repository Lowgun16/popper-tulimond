import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { getMemberSession } from "@/lib/memberAuth";
import { v4 as uuidv4 } from "uuid";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { paymentIntentId, shippingAddress, payerEmail, payerName, payerPhone } = await req.json();

  const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not confirmed" }, { status: 400 });
  }

  const metadata = pi.metadata as Record<string, string>;
  const items = JSON.parse(metadata.items || "[]");
  const totalCents = pi.amount;

  const phone = payerPhone ?? metadata.phone ?? "";
  const email = payerEmail ?? pi.receipt_email ?? "";
  const name = payerName ?? "";

  const shipping = shippingAddress ?? { line1: "", city: "", state: "", postal_code: "", country: "US" };

  // Check if order already exists (idempotent)
  const existing = await sql`SELECT id FROM orders WHERE stripe_payment_intent_id = ${paymentIntentId}`;

  if (existing.length === 0) {
    // Atomic inventory decrement for non-members
    if (metadata.is_member !== "true") {
      const decremented = await sql`
        UPDATE initiation_drops
        SET sold_count = sold_count + 1
        WHERE id = (SELECT id FROM initiation_drops ORDER BY drop_month DESC LIMIT 1)
          AND sold_count < available_count
        RETURNING id
      `;
      if (decremented.length === 0) {
        return NextResponse.json({ error: "Sold out" }, { status: 409 });
      }
    }

    // Create order
    await sql`
      INSERT INTO orders (stripe_payment_intent_id, name, phone, email, shipping_address, items, total_cents)
      VALUES (${paymentIntentId}, ${name}, ${phone}, ${email}, ${JSON.stringify(shipping)}, ${JSON.stringify(items)}, ${totalCents})
    `;

    // Send order confirmation email (non-blocking)
    if (email) {
      try {
        const { Resend } = await import("resend");
        const { render } = await import("@react-email/components");
        const OrderConfirmationEmail = (await import("@/emails/OrderConfirmation")).default;

        const resend = new Resend(process.env.RESEND_API_KEY);
        const html = await render(
          OrderConfirmationEmail({
            name,
            orderId: paymentIntentId,
            items: items.map((i: { name: string; size: string; priceCents: number }) => i),
            totalCents,
            shippingAddress: shipping,
          })
        );

        await resend.emails.send({
          from: process.env.FROM_EMAIL ?? "orders@poppertulimond.com",
          to: email,
          subject: "Your order is confirmed — Popper Tulimond",
          html,
        });
      } catch (err) {
        console.error("[orders/confirm] Resend error:", err);
      }
    }
  }

  // Get or create member
  const memberSession = await getMemberSession();
  if (memberSession) {
    return NextResponse.json({ setupToken: null }); // already a member
  }

  const existingMember = await sql`SELECT id, passkey_registered, setup_token FROM members WHERE phone = ${phone}`;

  if (existingMember.length > 0) {
    const m = existingMember[0];
    if (m.passkey_registered) return NextResponse.json({ setupToken: null });
    return NextResponse.json({ setupToken: m.setup_token });
  }

  // Create new member record
  const setupToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO members (phone, email, name, setup_token, setup_token_expires_at)
    VALUES (${phone}, ${email}, ${name}, ${setupToken}, ${expiresAt})
    RETURNING id
  `;

  // Migrate from Pledge to Member in sms_signups
  await sql`
    UPDATE sms_signups SET segment = 'member' WHERE phone = ${phone}
  `;

  // Send Twilio setup text (non-blocking)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://poppertulimond.com";
  const setupUrl = `${baseUrl}/membership-setup?token=${setupToken}`;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber && phone) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: `You're almost a member. Finish your registration: ${setupUrl} — shop the Vault anytime instead of waiting until next month.`,
        from: fromNumber,
        to: phone,
      });
    } catch (err) {
      console.error("[orders/confirm] Twilio error:", err);
    }
  }

  return NextResponse.json({ setupToken });
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${String(err)}` }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    // Ensure order exists (idempotent — /api/orders/confirm may have already run)
    const existing = await sql`SELECT id FROM orders WHERE stripe_payment_intent_id = ${pi.id}`;
    if (existing.length === 0) {
      // Client-side confirm didn't run (e.g. browser closed) — call our own confirm logic
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: pi.id }),
      });
    }
  }

  return NextResponse.json({ received: true });
}

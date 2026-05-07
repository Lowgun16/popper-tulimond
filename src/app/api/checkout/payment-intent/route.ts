import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { getStorePhase, type DropRow } from "@/lib/storeState";
import { getMemberSession } from "@/lib/memberAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { items, phone } = (await req.json()) as {
    items: Array<{
      itemId: string;
      name: string;
      size: string;
      initiationPriceCents: number;
      memberPriceCents: number;
    }>;
    phone?: string;
  };

  if (!items?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Check member session
  const memberSession = await getMemberSession();
  const isMember = !!memberSession;

  // Check store state for non-members
  if (!isMember) {
    const dropRows = await sql`SELECT * FROM initiation_drops ORDER BY drop_month DESC LIMIT 1`;
    if (dropRows.length === 0) {
      return NextResponse.json({ error: "Store is not open" }, { status: 403 });
    }
    const drop = dropRows[0] as DropRow;
    const phase = getStorePhase(drop, new Date());

    // Check early access cookie for early_access phase
    const earlyAccessToken = req.cookies.get("early_access_session")?.value;
    if (phase === "early_access" && !earlyAccessToken) {
      return NextResponse.json({ error: "Early access required" }, { status: 403 });
    }
    if (phase !== "open" && phase !== "early_access") {
      return NextResponse.json({ error: "Store is closed" }, { status: 403 });
    }
    if (phase === "early_access" && earlyAccessToken) {
      // Validate token against DB
      const tokenRows = await sql`
        SELECT id FROM early_access_tokens WHERE token = ${earlyAccessToken} AND drop_id = ${drop.id}
      `;
      if (tokenRows.length === 0) {
        return NextResponse.json({ error: "Invalid early access token" }, { status: 403 });
      }
    }
  }

  // Compute prices
  // Non-members: 1st Constable at initiation price, 2nd at member price
  // Members: always member price
  let constableCount = 0;
  const lineItems = items.map((item) => {
    if (!isMember) {
      constableCount++;
      const priceCents =
        constableCount === 1 ? item.initiationPriceCents : item.memberPriceCents;
      return { ...item, priceCents };
    }
    return { ...item, priceCents: item.memberPriceCents };
  });

  const totalCents = lineItems.reduce((sum, i) => sum + i.priceCents, 0);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      items: JSON.stringify(
        lineItems.map((i) => ({
          itemId: i.itemId,
          name: i.name,
          size: i.size,
          priceCents: i.priceCents,
        }))
      ),
      phone: phone ?? "",
      is_member: isMember ? "true" : "false",
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}

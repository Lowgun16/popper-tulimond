import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { getStorePhase } from "@/lib/storeState";
import { getMemberSession } from "@/lib/memberAuth";
import { getCurrentDrop } from "@/lib/drops";
import { getInventoryItem } from "@/lib/inventoryLookup";
import { itemPriceCents, canNonMemberPurchase } from "@/lib/pricing";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
  const { items, phone } = (await req.json()) as {
    items: Array<{
      itemId: string;
      size: string;
    }>;
    phone?: string;
  };

  if (!items?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const memberSession = await getMemberSession();
  const isMember = !!memberSession;

  // Resolve every line item against canonical server inventory (never trust client prices).
  const resolved = items.map((i) => {
    const inv = getInventoryItem(i.itemId);
    if (!inv) throw new Error(`Unknown item: ${i.itemId}`);
    return { itemId: i.itemId, name: inv.name, size: i.size, inv };
  });

  if (!isMember) {
    // Non-members: store must be open (or early access w/ valid token), and only public items.
    const drop = await getCurrentDrop();
    if (!drop) return NextResponse.json({ error: "Store is not open" }, { status: 403 });
    const phase = getStorePhase(drop, new Date());

    if (phase !== "open" && phase !== "early_access") {
      return NextResponse.json({ error: "Store is closed" }, { status: 403 });
    }
    if (phase === "early_access") {
      const token = req.cookies.get("early_access_session")?.value;
      const ok = token
        ? (await sql`SELECT 1 FROM early_access_tokens WHERE token = ${token} AND drop_id = ${drop.id}`).length > 0
        : false;
      if (!ok) return NextResponse.json({ error: "Early access required" }, { status: 403 });
    }
    for (const r of resolved) {
      if (!canNonMemberPurchase(r.inv)) {
        return NextResponse.json({ error: "Members only" }, { status: 403 });
      }
    }
    if (drop.limit_one_per_nonmember) {
      const constableCount = resolved.filter((r) => r.inv.type === "public").length;
      if (constableCount > 1) {
        return NextResponse.json(
          { error: "Only one Constable per person during this opening." },
          { status: 409 }
        );
      }
    }
  }

  // Flat price for everyone.
  const lineItems = resolved.map((r) => ({
    itemId: r.itemId, name: r.name, size: r.size, priceCents: itemPriceCents(r.inv),
  }));
  const totalCents = lineItems.reduce((s, i) => s + i.priceCents, 0);

  const paymentIntent = await getStripe().paymentIntents.create({
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
  } catch (err) {
    console.error("[payment-intent] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

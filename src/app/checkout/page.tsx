"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import SmsSignupSheet from "@/components/SmsSignupSheet";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const DARK = "#0e0e0e";
const GOLD = "#C4A456";

function CheckoutForm({ totalCents }: { totalCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus("processing");
    setErrorMsg(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Create order + member record
      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      const data = await res.json();
      clearCart();
      if (data.setupToken) {
        router.push(`/membership-setup?token=${data.setupToken}`);
      } else {
        router.push("/"); // already a member
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <AddressElement options={{ mode: "shipping" }} />
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || status === "processing"}
        style={{
          width: "100%",
          padding: "16px",
          background: "rgba(196,164,86,0.1)",
          border: `1px solid ${GOLD}`,
          color: GOLD,
          fontFamily: "var(--font-title, serif)",
          fontSize: "11px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          cursor: status === "processing" ? "not-allowed" : "pointer",
          opacity: status === "processing" ? 0.6 : 1,
        }}
      >
        {status === "processing" ? "Processing..." : `Complete Purchase — ${formatPrice(totalCents)}`}
      </button>
      {errorMsg && <p style={{ color: "#e05555", fontSize: "13px" }}>{errorMsg}</p>}
    </form>
  );
}

export default function CheckoutPage() {
  const { items } = useCart();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storeClosed, setStoreClosed] = useState(false);
  const [lineItems, setLineItems] = useState<(typeof items[number] & { priceCents: number })[]>([]);
  const [totalCents, setTotalCents] = useState(0);

  useEffect(() => {
    if (items.length === 0) {
      router.push("/");
      return;
    }

    // Fetch member session and payment intent in parallel
    Promise.all([
      fetch("/api/member/session").then((r) => r.json()).catch(() => null),
      fetch("/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }).then((r) => r.json()),
    ])
      .then(([memberSession, paymentData]) => {
        if (!paymentData.clientSecret) {
          const msg = paymentData.error ?? "";
          if (msg === "Store is not open" || msg === "Store is closed" || msg === "Early access required") {
            setStoreClosed(true);
          } else {
            setError(msg || "Unable to start checkout");
          }
          return;
        }

        const isMember = !!memberSession?.member;
        let constableCount = 0;
        const computed = items.map((item) => {
          if (!isMember) {
            constableCount++;
            return {
              ...item,
              priceCents: constableCount === 1 ? item.initiationPriceCents : item.memberPriceCents,
            };
          }
          return { ...item, priceCents: item.memberPriceCents };
        });
        const total = computed.reduce((sum, i) => sum + i.priceCents, 0);

        setLineItems(computed);
        setTotalCents(total);
        setClientSecret(paymentData.clientSecret);
      })
      .catch(() => setError("Network error. Please try again."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (storeClosed) {
    return (
      <>
        <div
          style={{
            minHeight: "100dvh",
            background: DARK,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-title, serif)", fontSize: "9px", letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: 24 }}>
              Popper Tulimond
            </p>
            <h1 style={{ fontFamily: "var(--font-display, serif)", fontSize: "26px", fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 16, lineHeight: 1.3 }}>
              The store opens on the 16th.
            </h1>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "15px", color: "rgba(240,232,215,0.55)", lineHeight: 1.7, marginBottom: 32 }}>
              New members are accepted once a month. Sign up for texts and we&apos;ll send you early access — 15 minutes before the doors open.
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                background: "rgba(196,164,86,0.1)",
                border: `1px solid ${GOLD}`,
                color: GOLD,
                padding: "14px 32px",
                cursor: "pointer",
                fontFamily: "var(--font-title, serif)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Get Early Access
            </button>
          </div>
        </div>
        <SmsSignupSheet isOpen={true} onClose={() => router.push("/")} source="blocked_purchase" />
      </>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: DARK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            color: "rgba(240,232,215,0.7)",
            fontFamily: "var(--font-body, sans-serif)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#e05555", marginBottom: 12 }}>{error}</p>
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: `1px solid ${GOLD}`,
              color: GOLD,
              padding: "10px 24px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: DARK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "rgba(240,232,215,0.4)", fontFamily: "var(--font-body, sans-serif)" }}>
          Preparing checkout...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: DARK, padding: "40px 24px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "var(--font-title, serif)",
            fontSize: "9px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: GOLD,
            marginBottom: 32,
          }}
        >
          Popper Tulimond
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display, serif)",
            fontSize: "24px",
            fontWeight: 300,
            color: "rgba(240,232,215,0.95)",
            marginBottom: 32,
          }}
        >
          Complete Your Order
        </h1>

        {/* Order summary */}
        <div
          style={{
            marginBottom: 32,
            borderBottom: "1px solid rgba(196,164,86,0.2)",
            paddingBottom: 20,
          }}
        >
          {lineItems.map((item) => (
            <div
              key={item.id}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}
            >
              <span
                style={{
                  color: "rgba(240,232,215,0.7)",
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "14px",
                }}
              >
                {item.name} — {item.colorway} / {item.size}
              </span>
              <span
                style={{
                  color: GOLD,
                  fontFamily: "var(--font-display, serif)",
                  fontSize: "14px",
                }}
              >
                {formatPrice(item.priceCents)}
              </span>
            </div>
          ))}
        </div>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: "night", variables: { colorPrimary: GOLD } },
          }}
        >
          <CheckoutForm totalCents={totalCents} />
        </Elements>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe, type PaymentRequest } from "@stripe/stripe-js";
import OverlayPortal from "@/components/OverlayPortal";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import ReservationSheet from "@/components/ReservationSheet";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartDrawerProps {
  onCheckout?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAWER_BG = "#0e0e0e";
const GOLD = "rgba(196, 164, 86, 0.3)";
const GOLD_SOLID = "#C4A456";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── CartDrawer ───────────────────────────────────────────────────────────────

export default function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { items, isOpen, closeCart, removeItem, clearCart } = useCart();
  const router = useRouter();

  const [reservationOpen, setReservationOpen] = useState(false);

  // Payment Request (Apple Pay / Google Pay)
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canPayApple, setCanPayApple] = useState(false);
  const [canPayGoogle, setCanPayGoogle] = useState(false);
  const stripeRef = useRef<Stripe | null>(null);

  const checkStoreOpen = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.slice(0, 1) }),
      });
      if (res.status === 403) return false;
      return true;
    } catch {
      return true; // optimistic — let Stripe catch it
    }
  };

  const handleAppleGooglePay = async () => {
    const open = await checkStoreOpen();
    if (!open) { setReservationOpen(true); return; }
    paymentRequest?.show();
  };

  const handlePayAnotherWay = async () => {
    const open = await checkStoreOpen();
    if (!open) { setReservationOpen(true); return; }
    closeCart();
    router.push("/checkout");
  };

  useEffect(() => {
    if (items.length === 0) return;
    const totalCents = items.reduce((sum, i) => sum + i.initiationPriceCents, 0);

    stripePromise.then((stripe) => {
      if (!stripe) return;
      stripeRef.current = stripe;

      const pr = stripe.paymentRequest({
        country: "US",
        currency: "usd",
        total: { label: "Popper Tulimond", amount: totalCents },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        requestShipping: true,
        shippingOptions: [
          { id: "standard", label: "Standard Shipping", detail: "", amount: 0 },
        ],
      });

      pr.canMakePayment().then((result) => {
        if (!result) return;
        setPaymentRequest(pr);
        setCanPayApple(!!result.applePay);
        setCanPayGoogle(!!result.googlePay);
      });

      pr.on("paymentmethod", async (ev) => {
        // Create payment intent
        const piRes = await fetch("/api/checkout/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const { clientSecret, error: piError } = await piRes.json();
        if (piError) {
          ev.complete("fail");
          return;
        }

        const { error } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (error) {
          ev.complete("fail");
          return;
        }
        ev.complete("success");

        // Confirm order server-side
        const confirmRes = await fetch("/api/orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: clientSecret.split("_secret_")[0],
            shippingAddress: ev.shippingAddress,
            payerEmail: ev.payerEmail,
            payerName: ev.payerName,
            payerPhone: ev.payerPhone,
          }),
        });
        const data = await confirmRes.json();
        clearCart();
        closeCart();
        if (data.setupToken) {
          router.push(`/membership-setup?token=${data.setupToken}`);
        } else {
          router.push("/");
        }
      });
    });
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute order total from cents
  const total = items.reduce((acc, item) => acc + item.initiationPriceCents, 0);
  const formattedTotal = formatPrice(total);

  return (
    <>
    <OverlayPortal>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 800,
            }}
          />

          {/* Drawer */}
          <motion.div
            key="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              maxWidth: 400,
              background: DRAWER_BG,
              borderLeft: `1px solid ${GOLD}`,
              zIndex: 801,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: `1px solid ${GOLD}`,
                flexShrink: 0,
              }}
            >
              <h2 className="type-heading" style={{ color: "var(--color-parchment, #EDE6D6)", margin: 0 }}>
                YOUR CART
              </h2>
              <button
                onClick={closeCart}
                aria-label="Close cart"
                style={{
                  width: 44,
                  height: 44,
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                ✕
              </button>
            </div>

            {/* ── Item list or empty state ────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
              {items.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    padding: "40px 24px",
                    textAlign: "center",
                    gap: 12,
                  }}
                >
                  <p className="type-eyebrow" style={{ color: GOLD_SOLID }}>
                    THE CART IS EMPTY
                  </p>
                  <p className="type-body" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.875rem" }}>
                    Your story begins with a Constable.
                  </p>
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {items.map((item) => (
                    <li
                      key={item.id}
                      style={{
                        padding: "20px 24px",
                        borderBottom: `1px solid rgba(196,164,86,0.12)`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {/* Name row with remove button */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <h3
                          className="type-heading"
                          style={{ color: "var(--color-parchment, #EDE6D6)", margin: 0, fontSize: "0.9rem" }}
                        >
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: GOLD_SOLID,
                            cursor: "pointer",
                            fontSize: "1rem",
                            opacity: 0.7,
                            flexShrink: 0,
                            padding: "0 4px",
                            lineHeight: 1,
                          }}
                          aria-label={`Remove ${item.name}`}
                        >
                          ×
                        </button>
                      </div>

                      {/* Collection + colorway */}
                      <p className="type-eyebrow" style={{ color: GOLD_SOLID, fontSize: "0.65rem", margin: 0 }}>
                        {item.collection} — {item.colorway}
                      </p>

                      {/* Size + price row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontFamily: "var(--font-title, Georgia, serif)", letterSpacing: "0.08em" }}>
                          Size {item.size}
                        </span>
                        <span style={{ color: "var(--color-parchment, #EDE6D6)", fontSize: "0.9rem", fontFamily: "var(--font-display, Georgia, serif)" }}>
                          {formatPrice(item.initiationPriceCents)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Payment section (sticky bottom) ────────────────────────── */}
            {items.length > 0 && (
              <div
                style={{
                  flexShrink: 0,
                  padding: "20px 24px 32px",
                  borderTop: "none",
                }}
              >
                {/* Gold gradient divider */}
                <div
                  style={{
                    height: 1,
                    background: "linear-gradient(to right, transparent, rgba(196,164,86,0.5), transparent)",
                    marginBottom: 20,
                  }}
                />

                {/* Order total */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.7rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-title, Georgia, serif)",
                    }}
                  >
                    Order Total
                  </span>
                  <span
                    className="type-heading"
                    style={{ color: GOLD_SOLID, fontSize: "1.3rem" }}
                  >
                    {formattedTotal}
                  </span>
                </div>

                {/* Apple Pay */}
                <button
                  onClick={handleAppleGooglePay}
                  style={{
                    background: "#000",
                    color: "#fff",
                    width: "100%",
                    height: 52,
                    borderRadius: 8,
                    fontSize: "1.1rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: canPayApple ? "flex" : "none",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    border: "none",
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}></span> Pay
                </button>

                {/* Google Pay */}
                <button
                  onClick={handleAppleGooglePay}
                  style={{
                    background: "#fff",
                    color: "#000",
                    width: "100%",
                    height: 48,
                    borderRadius: 8,
                    fontSize: "1rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    border: "1px solid #e0e0e0",
                    marginBottom: 16,
                    display: canPayGoogle ? "block" : "none",
                  }}
                >
                  G Pay
                </button>

                {/* Pay another way */}
                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={handlePayAnotherWay}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.35)",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-title, Georgia, serif)",
                      letterSpacing: "0.08em",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Pay another way
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </OverlayPortal>
    <ReservationSheet
      isOpen={reservationOpen}
      onClose={() => setReservationOpen(false)}
      cartItems={items.map((i) => ({ name: i.name, size: i.size, colorway: i.colorway }))}
    />
    </>
  );
}

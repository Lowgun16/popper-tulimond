import { Text, Section } from "@react-email/components";
import EmailLayout from "./EmailLayout";

interface OrderConfirmationProps {
  name: string;
  orderId: string;
  items: Array<{ name: string; size: string; priceCents: number }>;
  totalCents: number;
  shippingAddress: { line1: string; city: string; state: string; postal_code: string };
}

function fmt(cents: number) { return `$${Math.floor(cents / 100)}`; }

export default function OrderConfirmation({ name, orderId, items, totalCents, shippingAddress }: OrderConfirmationProps) {
  return (
    <EmailLayout>
      <Text style={{ fontSize: 22, fontWeight: 300, color: "rgba(240,232,215,0.95)", marginBottom: 8 }}>
        Your order is confirmed.
      </Text>
      <Text style={{ fontSize: 13, color: "rgba(240,232,215,0.5)", marginBottom: 32 }}>
        Order #{orderId.slice(0, 8).toUpperCase()}
      </Text>

      {items.map((item, i) => (
        <Section key={i} style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 14, color: "rgba(240,232,215,0.85)", margin: 0 }}>
            {item.name} &mdash; Size {item.size}
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(196,164,86,0.9)", margin: 0 }}>
            {fmt(item.priceCents)}
          </Text>
        </Section>
      ))}

      <Text style={{ fontSize: 16, color: "rgba(196,164,86,0.95)", marginTop: 16, marginBottom: 24 }}>
        Total: {fmt(totalCents)}
      </Text>

      <Text style={{ fontSize: 12, color: "rgba(240,232,215,0.4)", lineHeight: 1.7 }}>
        Shipping to: {shippingAddress.line1}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
      </Text>
    </EmailLayout>
  );
}

import LegalPageLayout from "@/components/LegalPageLayout";
import { SHIPPING_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Shipping & Fulfillment — Popper Tulimond" };

export default function ShippingPage() {
  return (
    <LegalPageLayout title={SHIPPING_CONTENT.title} lastUpdated={SHIPPING_CONTENT.lastUpdated}>
      {SHIPPING_CONTENT.body}
    </LegalPageLayout>
  );
}

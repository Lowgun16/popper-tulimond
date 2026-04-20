import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchLegalContent } from "@/lib/pageContent";

export const metadata = { title: "Shipping & Fulfillment — Popper Tulimond" };

export default async function ShippingPage() {
  const content = await fetchLegalContent("shipping");
  return (
    <LegalPageLayout title={content.title} lastUpdated={content.lastUpdated}>
      {content.body}
    </LegalPageLayout>
  );
}

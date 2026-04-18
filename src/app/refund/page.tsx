import LegalPageLayout from "@/components/LegalPageLayout";
import { REFUND_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Refund Policy — Popper Tulimond" };

export default function RefundPage() {
  return (
    <LegalPageLayout title={REFUND_CONTENT.title} lastUpdated={REFUND_CONTENT.lastUpdated}>
      {REFUND_CONTENT.body}
    </LegalPageLayout>
  );
}

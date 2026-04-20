import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchLegalContent } from "@/lib/pageContent";

export const metadata = { title: "Refund Policy — Popper Tulimond" };

export default async function RefundPage() {
  const content = await fetchLegalContent("refund");
  return (
    <LegalPageLayout title={content.title} lastUpdated={content.lastUpdated}>
      {content.body}
    </LegalPageLayout>
  );
}

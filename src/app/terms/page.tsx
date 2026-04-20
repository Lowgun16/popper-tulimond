import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchLegalContent } from "@/lib/pageContent";

export const metadata = { title: "Terms of Use — Popper Tulimond" };

export default async function TermsPage() {
  const content = await fetchLegalContent("terms");
  return (
    <LegalPageLayout title={content.title} lastUpdated={content.lastUpdated}>
      {content.body}
    </LegalPageLayout>
  );
}

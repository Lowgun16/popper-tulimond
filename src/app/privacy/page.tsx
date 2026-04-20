import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchLegalContent } from "@/lib/pageContent";

export const metadata = { title: "Privacy Policy — Popper Tulimond" };

export default async function PrivacyPage() {
  const content = await fetchLegalContent("privacy");
  return (
    <LegalPageLayout title={content.title} lastUpdated={content.lastUpdated}>
      {content.body}
    </LegalPageLayout>
  );
}

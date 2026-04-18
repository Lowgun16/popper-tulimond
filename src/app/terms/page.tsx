import LegalPageLayout from "@/components/LegalPageLayout";
import { TERMS_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Terms of Use — Popper Tulimond" };

export default function TermsPage() {
  return (
    <LegalPageLayout title={TERMS_CONTENT.title} lastUpdated={TERMS_CONTENT.lastUpdated}>
      {TERMS_CONTENT.body}
    </LegalPageLayout>
  );
}

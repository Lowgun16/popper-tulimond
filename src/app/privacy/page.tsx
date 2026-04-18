import LegalPageLayout from "@/components/LegalPageLayout";
import { PRIVACY_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Privacy Policy — Popper Tulimond" };

export default function PrivacyPage() {
  return (
    <LegalPageLayout title={PRIVACY_CONTENT.title} lastUpdated={PRIVACY_CONTENT.lastUpdated}>
      {PRIVACY_CONTENT.body}
    </LegalPageLayout>
  );
}

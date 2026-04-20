import LegalPageLayout from "@/components/LegalPageLayout";
import { fetchContactUsContent } from "@/lib/pageContent";

export const metadata = { title: "Contact Us — Popper Tulimond" };

export default async function ContactUsPage() {
  const content = await fetchContactUsContent();
  const optionalLines = [
    content.phone ? `Phone: ${content.phone}` : null,
    content.email ? `Email: ${content.email}` : null,
  ].filter((x): x is string => x !== null);

  const lines = [
    content.address.line1,
    content.address.line2,
    ...(optionalLines.length ? ["", ...optionalLines] : []),
    "",
    content.note,
  ].join("\n");

  return (
    <LegalPageLayout title="Contact Us" lastUpdated="">
      {lines}
    </LegalPageLayout>
  );
}

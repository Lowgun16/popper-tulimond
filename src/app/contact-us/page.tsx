import LegalPageLayout from "@/components/LegalPageLayout";
import { CONTACT_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Contact Us — Popper Tulimond" };

export default function ContactUsPage() {
  const { address, phone, email, note } = CONTACT_CONTENT;
  const optionalLines = [
    phone ? `Phone: ${phone}` : null,
    email ? `Email: ${email}` : null,
  ].filter((x): x is string => x !== null);

  const lines = [
    address.line1,
    address.line2,
    ...(optionalLines.length ? ["", ...optionalLines] : []),
    "",
    note,
  ].join("\n");

  return (
    <LegalPageLayout title="Contact Us" lastUpdated="April 2026">
      {lines}
    </LegalPageLayout>
  );
}

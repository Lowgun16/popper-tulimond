import LegalPageLayout from "@/components/LegalPageLayout";
import { CONTACT_CONTENT } from "@/lib/staticContent";

export const metadata = { title: "Contact Us — Popper Tulimond" };

export default function ContactUsPage() {
  const { address, phone, email, note } = CONTACT_CONTENT;
  const lines = [
    address.line1,
    address.line2,
    "",
    phone ? `Phone: ${phone}` : "",
    email ? `Email: ${email}` : "",
    "",
    note,
  ].filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");

  return (
    <LegalPageLayout title="Contact Us" lastUpdated="April 2026">
      {lines}
    </LegalPageLayout>
  );
}

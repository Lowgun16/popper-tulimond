// src/lib/contentTypes.ts

export type AboutContent = {
  headline: string;
  subheadline: string;
  sections: Array<{ id: string; title: string; body: string }>;
  closing: string;
};

export type ProtocolContent = {
  header: string;
  title: string;
  rules: Array<{ number: string; text: string }>;
  cta: string;
  ctaSubtext: string;
};

export type ContactContent = {
  headline: string;
  address: { line1: string; line2: string };
  phone: string;
  email: string;
  note: string;
};

export type LegalContent = {
  title: string;
  lastUpdated: string;
  body: string;
};

export type ContactUsContent = {
  address: { line1: string; line2: string };
  phone: string;
  email: string;
  note: string;
};

export type AllLegalContent = {
  terms: LegalContent;
  privacy: LegalContent;
  shipping: LegalContent;
  refund: LegalContent;
  contactUs: ContactUsContent;
};

export type AllPageContent = {
  about: AboutContent;
  protocol: ProtocolContent;
  contact: ContactContent;
  terms: LegalContent;
  privacy: LegalContent;
  shipping: LegalContent;
  refund: LegalContent;
  contactUs: ContactUsContent;
};

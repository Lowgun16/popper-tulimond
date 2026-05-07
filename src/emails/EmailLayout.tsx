import { Html, Head, Body, Container, Section, Text, Hr } from "@react-email/components";
import type { ReactNode } from "react";

export default function EmailLayout({ children }: { children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#0a0a0a", fontFamily: "Georgia, serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", padding: "0 24px" }}>
          <Text style={{ fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(196,164,86,0.8)", marginBottom: 32 }}>
            POPPER TULIMOND
          </Text>
          <Hr style={{ borderColor: "rgba(196,164,86,0.2)", marginBottom: 32 }} />
          {children}
          <Hr style={{ borderColor: "rgba(196,164,86,0.1)", marginTop: 40, marginBottom: 24 }} />
          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            poppertulimond.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

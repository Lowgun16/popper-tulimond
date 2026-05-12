import { Text, Link, Section } from "@react-email/components";
import EmailLayout from "./EmailLayout";

interface Props {
  loginUrl: string;
  name: string;
}

export default function AdminLoginLink({ loginUrl, name }: Props) {
  return (
    <EmailLayout>
      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", marginBottom: 8 }}>
        {name},
      </Text>
      <Text style={{ fontSize: 22, fontWeight: 300, color: "rgba(240,232,215,0.95)", letterSpacing: "0.02em", marginBottom: 8, lineHeight: 1.3 }}>
        Your sign-in link.
      </Text>
      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 32, lineHeight: 1.6 }}>
        Click the button below to access Edit Pages. This link expires in 15 minutes and can only be used once.
      </Text>
      <Section style={{ marginBottom: 32 }}>
        <Link
          href={loginUrl}
          style={{
            display: "inline-block",
            padding: "14px 40px",
            backgroundColor: "#C4A456",
            color: "#0a0a0a",
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            textDecoration: "none",
            fontFamily: "Georgia, serif",
          }}
        >
          Sign In
        </Link>
      </Section>
      <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.6 }}>
        If you didn&apos;t request this, ignore this email. The link will expire on its own.
      </Text>
    </EmailLayout>
  );
}

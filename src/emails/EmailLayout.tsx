import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://resinplug.com";

export default function EmailLayout({
  children,
  previewText,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        {previewText && (
          <Text style={previewStyle}>{previewText}</Text>
        )}
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Link href={FRONTEND_URL}>
              <Text style={logoText}>RESINPLUG</Text>
            </Link>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Need help?{" "}
              <Link href={`${FRONTEND_URL}/support`} style={footerLink}>
                Contact Support
              </Link>
            </Text>
            <Text style={footerMuted}>
              &copy; {new Date().getFullYear()} ResinPlug. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ── Styles ── */

const body: React.CSSProperties = {
  backgroundColor: "#0a0a0a",
  fontFamily:
    "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: 0,
};

const previewStyle: React.CSSProperties = {
  display: "none",
  overflow: "hidden",
  maxHeight: 0,
  maxWidth: 0,
};

const container: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#111111",
  borderRadius: "8px",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  backgroundColor: "#EC691B",
  padding: "24px",
  textAlign: "center" as const,
};

const logoText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: 800,
  letterSpacing: "3px",
  margin: 0,
  textDecoration: "none",
};

const content: React.CSSProperties = {
  padding: "32px 24px",
};

const hr: React.CSSProperties = {
  borderColor: "#333333",
  margin: "0 24px",
};

const footer: React.CSSProperties = {
  padding: "24px",
  textAlign: "center" as const,
};

const footerText: React.CSSProperties = {
  color: "#999999",
  fontSize: "13px",
  margin: "0 0 8px 0",
};

const footerLink: React.CSSProperties = {
  color: "#EC691B",
  textDecoration: "underline",
};

const footerMuted: React.CSSProperties = {
  color: "#666666",
  fontSize: "12px",
  margin: 0,
};

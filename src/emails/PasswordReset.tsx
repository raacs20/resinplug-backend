import { Text, Section, Link } from "@react-email/components";
import * as React from "react";
import EmailLayout from "./EmailLayout";

interface PasswordResetProps {
  firstName?: string;
  resetUrl: string;
  customHeading?: string;
  customBody?: string;
  customButtonText?: string;
}

export default function PasswordReset({
  firstName = "there",
  resetUrl = "https://resinplug.com/reset-password?token=example",
  customHeading,
  customBody,
  customButtonText,
}: PasswordResetProps) {
  const displayName = firstName || "there";
  const headingText = customHeading || "Reset Your Password";
  const bodyText = (customBody || "Hi {firstName}, we received a request to reset your password. Click the button below to choose a new password.")
    .replace(/\{firstName\}/g, displayName);
  const btnText = customButtonText || "Reset Password";

  return (
    <EmailLayout previewText="Reset your ResinPlug password">
      <Text style={headingStyle}>{headingText}</Text>
      <Text style={paragraph}>{bodyText}</Text>

      <Section style={ctaSection}>
        <Link href={resetUrl} style={ctaButton}>
          {btnText}
        </Link>
      </Section>

      <Section style={noticeBox}>
        <Text style={noticeText}>
          This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email — your password will remain unchanged.
        </Text>
      </Section>
    </EmailLayout>
  );
}

const headingStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: 700,
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#d1d1d1",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 24px 0",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#EC691B",
  color: "#ffffff",
  padding: "12px 32px",
  borderRadius: "6px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

const noticeBox: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "16px 20px",
};

const noticeText: React.CSSProperties = {
  color: "#999999",
  fontSize: "13px",
  lineHeight: "20px",
  margin: 0,
};

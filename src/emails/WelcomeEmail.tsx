import { Text, Section, Link } from "@react-email/components";
import * as React from "react";
import EmailLayout from "./EmailLayout";

interface WelcomeEmailProps {
  name?: string;
  email: string;
  customHeading?: string;
  customBody?: string;
  customButtonText?: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://resinplug.com";

export default function WelcomeEmail({
  name = "there",
  email = "customer@example.com",
  customHeading,
  customBody,
  customButtonText,
}: WelcomeEmailProps) {
  const displayName = name || "there";
  const headingText = customHeading || "Welcome to ResinPlug! 🎉";
  const bodyText = (customBody || "Hi {firstName}, thanks for creating an account with us! You're now part of the ResinPlug community.")
    .replace(/\{firstName\}/g, displayName);
  const btnText = customButtonText || "Start Shopping";

  return (
    <EmailLayout previewText="Welcome to ResinPlug!">
      <Text style={headingStyle}>{headingText}</Text>
      <Text style={paragraph}>{bodyText}</Text>

      <Section style={featureBox}>
        <Text style={featureTitle}>What you can do now:</Text>
        <Text style={featureItem}>🛒 Shop our premium resin products</Text>
        <Text style={featureItem}>⭐ Leave reviews and earn reward points</Text>
        <Text style={featureItem}>📦 Track your orders in real-time</Text>
        <Text style={featureItem}>💰 Earn credits on every purchase</Text>
      </Section>

      <Section style={ctaSection}>
        <Link href={`${FRONTEND_URL}/shop`} style={ctaButton}>
          {btnText}
        </Link>
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

const featureBox: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

const featureTitle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  margin: "0 0 12px 0",
};

const featureItem: React.CSSProperties = {
  color: "#d1d1d1",
  fontSize: "14px",
  lineHeight: "28px",
  margin: 0,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
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

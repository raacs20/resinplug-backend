import { Text, Section, Link } from "@react-email/components";
import * as React from "react";
import EmailLayout from "./EmailLayout";

interface AccountSetupProps {
  firstName?: string;
  orderNumber: string;
  pointsEarned: number;
  setupUrl: string;
  customHeading?: string;
  customBody?: string;
  customButtonText?: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://resinplug.com";

export default function AccountSetup({
  firstName = "there",
  orderNumber = "RP-XXXXXXXX",
  pointsEarned = 0,
  setupUrl = `${FRONTEND_URL}/set-password`,
  customHeading,
  customBody,
  customButtonText,
}: AccountSetupProps) {
  const displayName = firstName || "there";
  const headingText = customHeading || "Your Account Is Ready! 🎉";
  const bodyText = (
    customBody ||
    "Hi {firstName}, thanks for your order #{orderNumber}! We've created an account for you so you can track orders, earn rewards, and more. Just set your password to get started."
  )
    .replace(/\{firstName\}/g, displayName)
    .replace(/\{orderNumber\}/g, orderNumber);
  const btnText = customButtonText || "Set Your Password";

  return (
    <EmailLayout previewText={`Set your password — Order #${orderNumber} confirmed`}>
      <Text style={headingStyle}>{headingText}</Text>
      <Text style={paragraph}>{bodyText}</Text>

      {pointsEarned > 0 && (
        <Section style={rewardBox}>
          <Text style={rewardText}>
            🎁 You earned <strong>{pointsEarned} reward points</strong> from
            this purchase!
          </Text>
        </Section>
      )}

      <Section style={featureBox}>
        <Text style={featureTitle}>With your account, you can:</Text>
        <Text style={featureItem}>📦 Track your orders in real-time</Text>
        <Text style={featureItem}>
          💰 Use your {pointsEarned} reward points on future orders
        </Text>
        <Text style={featureItem}>⭐ Leave reviews and earn more points</Text>
        <Text style={featureItem}>❤️ Save products to your wishlist</Text>
      </Section>

      <Section style={ctaSection}>
        <Link href={setupUrl} style={ctaButton}>
          {btnText}
        </Link>
      </Section>

      <Section style={noticeBox}>
        <Text style={noticeText}>
          If you didn&apos;t place this order, you can safely ignore this email.
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

const rewardBox: React.CSSProperties = {
  backgroundColor: "#2a1a0a",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "24px",
  border: "1px solid #EC691B33",
};

const rewardText: React.CSSProperties = {
  color: "#EC691B",
  fontSize: "15px",
  lineHeight: "22px",
  margin: 0,
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

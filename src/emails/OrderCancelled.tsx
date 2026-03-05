import { Text, Section, Link } from "@react-email/components";
import * as React from "react";
import EmailLayout from "./EmailLayout";

interface OrderCancelledProps {
  orderNumber: string;
  firstName: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://resinplug.com";

export default function OrderCancelled({
  orderNumber = "RP-20260305-ABC",
  firstName = "Customer",
}: OrderCancelledProps) {
  return (
    <EmailLayout previewText={`Order ${orderNumber} has been cancelled`}>
      <Text style={heading}>Order Cancelled</Text>
      <Text style={paragraph}>
        Hi {firstName}, your order <strong>{orderNumber}</strong> has been
        cancelled. If you used any credits, they have been refunded to your
        account.
      </Text>
      <Text style={paragraph}>
        If you didn&apos;t request this cancellation or have any questions, please
        reach out to our support team.
      </Text>

      <Section style={orderBox}>
        <Text style={orderLabel}>Order Number</Text>
        <Text style={orderValue}>{orderNumber}</Text>
      </Section>

      <Section style={ctaSection}>
        <Link href={`${FRONTEND_URL}/support`} style={ctaButton}>
          Contact Support
        </Link>
      </Section>
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: 700,
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#d1d1d1",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const orderBox: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const orderLabel: React.CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 4px 0",
};

const orderValue: React.CSSProperties = {
  color: "#EC691B",
  fontSize: "20px",
  fontWeight: 700,
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

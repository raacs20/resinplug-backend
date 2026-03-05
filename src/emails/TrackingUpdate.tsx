import { Text, Section, Link } from "@react-email/components";
import * as React from "react";
import EmailLayout from "./EmailLayout";

interface TrackingUpdateProps {
  orderNumber: string;
  firstName: string;
  trackingNumber: string;
  carrierName?: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://resinplug.com";

export default function TrackingUpdate({
  orderNumber = "RP-20260305-ABC",
  firstName = "Customer",
  trackingNumber = "1Z999AA10123456784",
  carrierName = "Canada Post",
}: TrackingUpdateProps) {
  return (
    <EmailLayout
      previewText={`Tracking info for order ${orderNumber}`}
    >
      <Text style={heading}>Your Tracking Info Is Here! 🚚</Text>
      <Text style={paragraph}>
        Hi {firstName}, your order <strong>{orderNumber}</strong> now has
        tracking information available.
      </Text>

      <Section style={trackingBox}>
        <Text style={trackingLabel}>Tracking Number</Text>
        <Text style={trackingValue}>{trackingNumber}</Text>
        {carrierName && (
          <Text style={carrierText}>Carrier: {carrierName}</Text>
        )}
      </Section>

      <Section style={ctaSection}>
        <Link href={`${FRONTEND_URL}/tracking`} style={ctaButton}>
          Track Your Package
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
  margin: "0 0 24px 0",
};

const trackingBox: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const trackingLabel: React.CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 4px 0",
};

const trackingValue: React.CSSProperties = {
  color: "#EC691B",
  fontSize: "20px",
  fontWeight: 700,
  fontFamily: "monospace",
  margin: "0 0 8px 0",
};

const carrierText: React.CSSProperties = {
  color: "#999999",
  fontSize: "14px",
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

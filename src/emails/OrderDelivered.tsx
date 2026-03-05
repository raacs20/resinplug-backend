import { Text, Section, Link } from "@react-email/components";
import * as React from "react";
import EmailLayout from "./EmailLayout";

interface OrderDeliveredProps {
  orderNumber: string;
  firstName: string;
  customHeading?: string;
  customBody?: string;
  customBody2?: string;
  customButtonText?: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://resinplug.com";

export default function OrderDelivered({
  orderNumber = "RP-20260305-ABC",
  firstName = "Customer",
  customHeading,
  customBody,
  customBody2,
  customButtonText,
}: OrderDeliveredProps) {
  const headingText = customHeading || "Your Order Has Been Delivered! ✅";
  const bodyText = (customBody || "Hi {firstName}, your order {orderNumber} has been delivered. We hope you love your new products!")
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{orderNumber\}/g, orderNumber);
  const body2Text = (customBody2 || "If you have a moment, we'd love to hear what you think. Leave a review and earn 100 reward points!")
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{orderNumber\}/g, orderNumber);
  const btnText = customButtonText || "Leave a Review";

  return (
    <EmailLayout previewText={`Order ${orderNumber} has been delivered!`}>
      <Text style={headingStyle}>{headingText}</Text>
      <Text style={paragraph}>{bodyText}</Text>
      <Text style={paragraph}>{body2Text}</Text>

      <Section style={orderBox}>
        <Text style={orderLabel}>Order Number</Text>
        <Text style={orderValue}>{orderNumber}</Text>
      </Section>

      <Section style={ctaSection}>
        <Link href={`${FRONTEND_URL}/reviews`} style={ctaButton}>
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

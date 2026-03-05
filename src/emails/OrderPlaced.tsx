import { Text, Section, Row, Column, Hr, Link } from "@react-email/components";
import * as React from "react";
import EmailLayout from "./EmailLayout";

interface OrderItem {
  productName: string;
  weight: string;
  quantity: number;
  unitPrice: number;
}

interface OrderPlacedProps {
  orderNumber: string;
  firstName: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  discountAmount?: number;
  creditsUsed?: number;
  street1: string;
  street2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  // Content overrides
  customHeading?: string;
  customBody?: string;
  customButtonText?: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://resinplug.com";

export default function OrderPlaced({
  orderNumber = "RP-20260305-ABC",
  firstName = "Customer",
  items = [
    { productName: "Pink Kush", weight: "3g", quantity: 1, unitPrice: 25 },
  ],
  subtotal = 25,
  shippingCost = 0,
  total = 25,
  discountAmount,
  creditsUsed,
  street1 = "123 Main St",
  street2,
  city = "Toronto",
  province = "ON",
  postalCode = "M5V 1A1",
  country = "Canada",
  customHeading,
  customBody,
  customButtonText,
}: OrderPlacedProps) {
  const headingText = customHeading || "Order Confirmed! 🎉";
  const bodyText = (customBody || "Hi {firstName}, thank you for your order! We've received your order and are getting it ready.")
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{orderNumber\}/g, orderNumber);
  const btnText = customButtonText || "Track Your Order";

  return (
    <EmailLayout previewText={`Order ${orderNumber} confirmed!`}>
      <Text style={headingStyle}>{headingText}</Text>
      <Text style={paragraph}>{bodyText}</Text>

      <Section style={orderBox}>
        <Text style={orderLabel}>Order Number</Text>
        <Text style={orderValue}>{orderNumber}</Text>
      </Section>

      {/* Items */}
      <Section style={itemsSection}>
        <Text style={sectionTitle}>Order Summary</Text>
        {items.map((item, i) => (
          <Row key={i} style={itemRow}>
            <Column style={itemName}>
              {item.productName} ({item.weight}) × {item.quantity}
            </Column>
            <Column style={itemPrice}>
              ${(item.unitPrice * item.quantity).toFixed(2)}
            </Column>
          </Row>
        ))}
        <Hr style={itemHr} />
        <Row style={totalRow}>
          <Column style={itemName}>Subtotal</Column>
          <Column style={itemPrice}>${subtotal.toFixed(2)}</Column>
        </Row>
        {discountAmount && discountAmount > 0 ? (
          <Row style={totalRow}>
            <Column style={itemName}>Discount</Column>
            <Column style={{ ...itemPrice, color: "#22c55e" }}>
              -${discountAmount.toFixed(2)}
            </Column>
          </Row>
        ) : null}
        {creditsUsed && creditsUsed > 0 ? (
          <Row style={totalRow}>
            <Column style={itemName}>Credits Applied</Column>
            <Column style={{ ...itemPrice, color: "#22c55e" }}>
              -${creditsUsed.toFixed(2)}
            </Column>
          </Row>
        ) : null}
        <Row style={totalRow}>
          <Column style={itemName}>Shipping</Column>
          <Column style={itemPrice}>
            {shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)}`}
          </Column>
        </Row>
        <Hr style={itemHr} />
        <Row style={totalRow}>
          <Column style={totalLabel}>Total</Column>
          <Column style={totalValue}>${total.toFixed(2)}</Column>
        </Row>
      </Section>

      {/* Shipping Address */}
      <Section style={addressSection}>
        <Text style={sectionTitle}>Shipping Address</Text>
        <Text style={addressText}>
          {street1}
          {street2 ? `, ${street2}` : ""}
          <br />
          {city}, {province} {postalCode}
          <br />
          {country}
        </Text>
      </Section>

      <Section style={ctaSection}>
        <Link href={`${FRONTEND_URL}/tracking`} style={ctaButton}>
          {btnText}
        </Link>
      </Section>
    </EmailLayout>
  );
}

/* ── Styles ── */

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

const itemsSection: React.CSSProperties = {
  marginBottom: "24px",
};

const sectionTitle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 600,
  margin: "0 0 12px 0",
};

const itemRow: React.CSSProperties = {
  marginBottom: "8px",
};

const itemName: React.CSSProperties = {
  color: "#d1d1d1",
  fontSize: "14px",
};

const itemPrice: React.CSSProperties = {
  color: "#d1d1d1",
  fontSize: "14px",
  textAlign: "right" as const,
};

const itemHr: React.CSSProperties = {
  borderColor: "#333333",
  margin: "12px 0",
};

const totalRow: React.CSSProperties = {
  marginBottom: "4px",
};

const totalLabel: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 700,
};

const totalValue: React.CSSProperties = {
  color: "#EC691B",
  fontSize: "18px",
  fontWeight: 700,
  textAlign: "right" as const,
};

const addressSection: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const addressText: React.CSSProperties = {
  color: "#d1d1d1",
  fontSize: "14px",
  lineHeight: "22px",
  margin: 0,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginTop: "8px",
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

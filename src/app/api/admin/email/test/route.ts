import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendEmail, getEmailContentWithDefaults } from "@/lib/email";
import { success, badRequest, serverError } from "@/lib/api-response";
import { createElement } from "react";

// Template imports
import OrderPlaced from "@/emails/OrderPlaced";
import OrderShipped from "@/emails/OrderShipped";
import OrderDelivered from "@/emails/OrderDelivered";
import OrderCancelled from "@/emails/OrderCancelled";
import TrackingUpdate from "@/emails/TrackingUpdate";
import WelcomeEmail from "@/emails/WelcomeEmail";

/* Sample data for test emails */
const SAMPLE_ORDER_ITEMS = [
  { productName: "Pink Kush", weight: "3g", quantity: 2, unitPrice: 25 },
  { productName: "Death Bubba", weight: "1g", quantity: 1, unitPrice: 10 },
];

async function getTestTemplate(type: string): Promise<{
  subject: string;
  react: React.ReactElement;
} | null> {
  const content = await getEmailContentWithDefaults(type);

  switch (type) {
    case "order_placed":
      return {
        subject: "[TEST] Your ResinPlug Order #RP-TEST-001",
        react: createElement(OrderPlaced, {
          orderNumber: "RP-TEST-001",
          firstName: "Test",
          items: SAMPLE_ORDER_ITEMS,
          subtotal: 60,
          shippingCost: 0,
          total: 60,
          street1: "123 Test Street",
          city: "Toronto",
          province: "ON",
          postalCode: "M5V 1A1",
          country: "Canada",
          customHeading: content.heading,
          customBody: content.body,
          customButtonText: content.buttonText,
        }),
      };
    case "order_shipped":
      return {
        subject: "[TEST] Your Order #RP-TEST-001 Has Shipped",
        react: createElement(OrderShipped, {
          orderNumber: "RP-TEST-001",
          firstName: "Test",
          customHeading: content.heading,
          customBody: content.body,
          customBody2: content.body2,
          customButtonText: content.buttonText,
        }),
      };
    case "order_delivered":
      return {
        subject: "[TEST] Your Order #RP-TEST-001 Has Been Delivered",
        react: createElement(OrderDelivered, {
          orderNumber: "RP-TEST-001",
          firstName: "Test",
          customHeading: content.heading,
          customBody: content.body,
          customBody2: content.body2,
          customButtonText: content.buttonText,
        }),
      };
    case "order_cancelled":
      return {
        subject: "[TEST] Order #RP-TEST-001 Cancelled",
        react: createElement(OrderCancelled, {
          orderNumber: "RP-TEST-001",
          firstName: "Test",
          customHeading: content.heading,
          customBody: content.body,
          customBody2: content.body2,
          customButtonText: content.buttonText,
        }),
      };
    case "tracking_update":
      return {
        subject: "[TEST] Tracking Info for Order #RP-TEST-001",
        react: createElement(TrackingUpdate, {
          orderNumber: "RP-TEST-001",
          firstName: "Test",
          trackingNumber: "1Z999AA10123456784",
          carrierName: "Canada Post",
          customHeading: content.heading,
          customBody: content.body,
          customButtonText: content.buttonText,
        }),
      };
    case "welcome":
      return {
        subject: "[TEST] Welcome to ResinPlug!",
        react: createElement(WelcomeEmail, {
          name: "Test User",
          email: "test@example.com",
          customHeading: content.heading,
          customBody: content.body,
          customButtonText: content.buttonText,
        }),
      };
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { type, to } = body as { type: string; to: string };

    if (!type || !to) return badRequest("type and to are required");

    const template = await getTestTemplate(type);
    if (!template) return badRequest("Invalid email type");

    const result = await sendEmail({
      type,
      to,
      subject: template.subject,
      react: template.react,
      skipEnabledCheck: true, // Always send test emails
    });

    if (result.success) {
      return success({ message: `Test email sent to ${to}` });
    } else {
      return serverError("Failed to send test email. Check RESEND_API_KEY.");
    }
  } catch (err) {
    console.error("Test email error:", err);
    return serverError();
  }
}

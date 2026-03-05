import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getEmailContentWithDefaults, EMAIL_DEFAULTS } from "@/lib/email";
import { success, badRequest, serverError } from "@/lib/api-response";
import { render } from "@react-email/render";
import { createElement } from "react";

// Template imports
import OrderPlaced from "@/emails/OrderPlaced";
import OrderShipped from "@/emails/OrderShipped";
import OrderDelivered from "@/emails/OrderDelivered";
import OrderCancelled from "@/emails/OrderCancelled";
import TrackingUpdate from "@/emails/TrackingUpdate";
import WelcomeEmail from "@/emails/WelcomeEmail";

/* Sample data for previews */
const SAMPLE_DATA = {
  order_placed: {
    orderNumber: "RP-20260305-ABC",
    firstName: "Sarah",
    items: [
      { productName: "Pink Kush", weight: "3g", quantity: 2, unitPrice: 25 },
      { productName: "Death Bubba", weight: "1g", quantity: 1, unitPrice: 10 },
    ],
    subtotal: 60,
    shippingCost: 0,
    total: 60,
    street1: "123 Queen Street West",
    city: "Toronto",
    province: "ON",
    postalCode: "M5V 1A1",
    country: "Canada",
  },
  order_shipped: {
    orderNumber: "RP-20260305-ABC",
    firstName: "Sarah",
  },
  order_delivered: {
    orderNumber: "RP-20260305-ABC",
    firstName: "Sarah",
  },
  order_cancelled: {
    orderNumber: "RP-20260305-ABC",
    firstName: "Sarah",
  },
  tracking_update: {
    orderNumber: "RP-20260305-ABC",
    firstName: "Sarah",
    trackingNumber: "1Z999AA10123456784",
    carrierName: "Canada Post",
  },
  welcome: {
    name: "Sarah",
    email: "sarah@example.com",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATE_MAP: Record<string, React.ComponentType<any>> = {
  order_placed: OrderPlaced,
  order_shipped: OrderShipped,
  order_delivered: OrderDelivered,
  order_cancelled: OrderCancelled,
  tracking_update: TrackingUpdate,
  welcome: WelcomeEmail,
};

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { type, overrides } = body as {
      type: string;
      overrides?: Record<string, string>;
    };

    if (!type || !TEMPLATE_MAP[type]) {
      return badRequest("Invalid email type");
    }

    // Get content: use provided overrides, or fetch from DB (with defaults)
    let content: Record<string, string>;
    if (overrides) {
      const defaults = EMAIL_DEFAULTS[type] || {};
      content = { ...defaults, ...overrides };
    } else {
      content = await getEmailContentWithDefaults(type);
    }

    // Build template props
    const sampleData = SAMPLE_DATA[type as keyof typeof SAMPLE_DATA] || {};
    const templateProps = {
      ...sampleData,
      customHeading: content.heading,
      customBody: content.body,
      customBody2: content.body2,
      customButtonText: content.buttonText,
    };

    const Template = TEMPLATE_MAP[type];
    const html = await render(createElement(Template, templateProps));

    return success({ html });
  } catch (err) {
    console.error("Email preview error:", err);
    return serverError();
  }
}

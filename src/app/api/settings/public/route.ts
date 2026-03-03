import { prisma } from "@/lib/prisma";
import { success, serverError } from "@/lib/api-response";

// Public settings — no auth required
const PUBLIC_KEYS = [
  "announcementBar",
  "announcementBarEnabled",
  "freeShippingThreshold",
  "featuredCollection",
  "siteTitle",
  "siteDescription",
  "maintenanceMode",
  // Branding
  "storeName",
  "brandLogo",
  "brandFavicon",
  "brandTagline",
  "colorPrimary",
  "colorPrimaryHover",
  "colorBackground",
  "colorCardDark",
  "colorBorder",
  "colorMutedText",
];

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return success(map);
  } catch (err) {
    console.error("Public settings error:", err);
    return serverError();
  }
}

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@resinplug.com" },
    update: { role: "admin" },
    create: {
      email: "admin@resinplug.com",
      name: "Admin",
      hashedPassword,
      role: "admin",
    },
  });
  console.log("Admin user:", admin.email, "(role:", admin.role, ")");

  // Seed default site settings
  const defaults = [
    { key: "announcementBar", value: "THE ABSOLUTE CHEAPEST RESIN IN USA! • FREE DELIVERY FROM $200", label: "Announcement Bar Text" },
    { key: "announcementBarEnabled", value: "true", label: "Announcement Bar Enabled" },
    { key: "freeShippingThreshold", value: "200", label: "Free Shipping Threshold" },
    { key: "siteTitle", value: "ResinPlug", label: "Site Title" },
    { key: "siteDescription", value: "The Absolute Cheapest Resin in the USA", label: "Site Description" },
    { key: "featuredCollection", value: "Bestsellers", label: "Featured Collection" },
    { key: "maintenanceMode", value: "false", label: "Maintenance Mode" },
  ];

  for (const setting of defaults) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("Default site settings seeded");

  // Seed sample coupons
  const coupons = [
    { code: "WELCOME10", discountType: "percentage" as const, discountValue: 10, minOrder: 50, maxUses: 100 },
    { code: "SAVE20", discountType: "percentage" as const, discountValue: 20, minOrder: 100, maxUses: 50 },
    { code: "FLAT15", discountType: "fixed" as const, discountValue: 15, minOrder: 75, maxUses: null },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrder: coupon.minOrder,
        maxUses: coupon.maxUses,
        isActive: true,
      },
    });
  }
  console.log("Sample coupons seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

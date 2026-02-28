import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* ── Slug helper (matches seed.ts) ── */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ── Mock reviews from frontend ReviewsPageContent ── */
const mockReviews = [
  {
    customerName: "Jeff C.",
    rating: 5,
    date: "2026-02-10",
    verified: true,
    productName: "Pink Kush",
    reviewText:
      "My resin came in record time, and it was as expected. I would order again and refer everyone I know to order from them.",
    helpfulCount: 12,
  },
  {
    customerName: "Sarah M.",
    rating: 5,
    date: "2026-02-08",
    verified: true,
    productName: "Gelato Cake",
    reviewText:
      "Best quality resin I've found online. The flavor and potency are unbeatable. Shipping was super fast. Already placed my second order!",
    helpfulCount: 24,
  },
  {
    customerName: "Mike R.",
    rating: 5,
    date: "2026-02-05",
    verified: true,
    productName: "Death Bubba",
    reviewText:
      "I was skeptical at first but these guys are legit. Great product, great price, and the customer service was top notch when I had a question.",
    helpfulCount: 18,
  },
  {
    customerName: "Lisa T.",
    rating: 5,
    date: "2026-01-28",
    verified: true,
    productName: "Cherry Gelato",
    reviewText:
      "Five stars all around. Fast shipping, discreet packaging, and the resin quality is consistently excellent. My go-to shop now.",
    helpfulCount: 31,
  },
  {
    customerName: "David W.",
    rating: 5,
    date: "2026-01-25",
    verified: true,
    productName: "Purple Kush",
    reviewText:
      "Hands down the best resin I've tried. Super smooth, amazing flavor profile, and the effects are exactly what I needed. Will be ordering more!",
    helpfulCount: 15,
  },
  {
    customerName: "Rachel K.",
    rating: 4,
    date: "2026-01-22",
    verified: true,
    productName: "Sour Apple",
    reviewText:
      "Really solid product. Shipping took an extra day but the quality more than made up for it. The sour apple flavor is incredible.",
    helpfulCount: 9,
  },
  {
    customerName: "Brandon P.",
    rating: 5,
    date: "2026-01-19",
    verified: true,
    productName: "Pineapple Express",
    reviewText:
      "This is premium stuff. The flavor is absolutely unreal and the potency is spot on. ResinPlug has earned a customer for life.",
    helpfulCount: 22,
  },
  {
    customerName: "Ashley N.",
    rating: 4,
    date: "2026-01-15",
    verified: true,
    productName: "Sunset Sherbet",
    reviewText:
      "Great quality for the price. Love the sunset sherbet strain, very relaxing. Packaging was discreet and professional. Would recommend.",
    helpfulCount: 7,
  },
  {
    customerName: "James L.",
    rating: 5,
    date: "2026-01-12",
    verified: true,
    productName: "Blue Zkittlez",
    reviewText:
      "Blown away by the quality. Ordered the Blue Zkittlez and it exceeded all expectations. The taste is phenomenal and it hits perfectly every time.",
    helpfulCount: 19,
  },
  {
    customerName: "Nicole F.",
    rating: 3,
    date: "2026-01-09",
    verified: true,
    productName: "Northern Lights",
    reviewText:
      "Product quality is decent but shipping was slower than expected. Took about a week to arrive. The resin itself is fine though.",
    helpfulCount: 3,
  },
  {
    customerName: "Tyler H.",
    rating: 5,
    date: "2026-01-06",
    verified: true,
    productName: "Grape Cake",
    reviewText:
      "Incredible product. The grape cake strain is one of the best I've had. Super potent and the flavor lasts. Fast delivery too. A+ all around.",
    helpfulCount: 27,
  },
  {
    customerName: "Megan D.",
    rating: 4,
    date: "2026-01-03",
    verified: true,
    productName: "Strawberry Mimosa",
    reviewText:
      "Love the flavor on this one. Perfect for daytime use. Only giving 4 stars because I wish they had a larger size option available.",
    helpfulCount: 11,
  },
  {
    customerName: "Chris B.",
    rating: 5,
    date: "2025-12-29",
    verified: true,
    productName: "Dosidos",
    reviewText:
      "Third order from ResinPlug and they never disappoint. Consistently top quality product with fast shipping. Can't recommend enough.",
    helpfulCount: 16,
  },
  {
    customerName: "Emma S.",
    rating: 2,
    date: "2025-12-25",
    verified: true,
    productName: "Rockstar",
    reviewText:
      "Product was okay but not what I expected based on the description. It was a bit harsh and the flavor wasn't as strong as I hoped.",
    helpfulCount: 2,
  },
  {
    customerName: "Kevin G.",
    rating: 5,
    date: "2025-12-20",
    verified: true,
    productName: "Cookies & Cream",
    reviewText:
      "If you're on the fence, just order it. Best resin you'll find at this price point. The cookies and cream flavor is amazing and it smokes so smooth.",
    helpfulCount: 33,
  },
  {
    customerName: "Jen W.",
    rating: 4,
    date: "2025-12-16",
    verified: false,
    productName: "Candy Chrome",
    reviewText:
      "Really enjoyed this strain. Sweet candy flavor and strong effects. Will definitely be ordering again. Great value for the quality.",
    helpfulCount: 8,
  },
  {
    customerName: "Marcus J.",
    rating: 5,
    date: "2025-12-12",
    verified: true,
    productName: "Island Pink",
    reviewText:
      "Island Pink from ResinPlug is fire. Super gassy, potent, and the quality is always consistent. This is the only place I order from now.",
    helpfulCount: 20,
  },
  {
    customerName: "Stephanie R.",
    rating: 3,
    date: "2025-12-08",
    verified: true,
    productName: "Lemonade OG",
    reviewText:
      "Good product overall. The lemonade flavor is nice but I found it a bit mild compared to other strains I've tried from here.",
    helpfulCount: 5,
  },
];

/* ── Main seed function ── */
async function main() {
  console.log("Seeding reviews...\n");

  // Build slug -> productId map by looking up all products
  const products = await prisma.product.findMany({
    select: { id: true, slug: true },
  });

  const slugToId = new Map<string, string>();
  for (const p of products) {
    slugToId.set(p.slug, p.id);
  }

  if (slugToId.size === 0) {
    console.error(
      "No products found in database. Run the main seed first: npm run db:seed"
    );
    process.exit(1);
  }

  // Map mock reviews to Review schema, resolving productId from slug
  const reviewData = [];
  const skipped: string[] = [];

  for (const r of mockReviews) {
    const slug = slugify(r.productName);
    const productId = slugToId.get(slug);

    if (!productId) {
      skipped.push(`${r.productName} (slug: ${slug})`);
      continue;
    }

    reviewData.push({
      productId,
      customerName: r.customerName,
      rating: r.rating,
      text: r.reviewText,
      verified: r.verified,
      helpfulCount: r.helpfulCount,
      createdAt: new Date(r.date),
    });
  }

  if (skipped.length > 0) {
    console.warn("Skipped reviews (product not found):", skipped);
  }

  // Clear existing reviews and bulk insert
  await prisma.review.deleteMany();

  const result = await prisma.review.createMany({
    data: reviewData,
  });

  console.log(`Created ${result.count} reviews.`);

  // Print summary by product
  const byProduct = new Map<string, number>();
  for (const r of mockReviews) {
    const slug = slugify(r.productName);
    if (slugToId.has(slug)) {
      byProduct.set(r.productName, (byProduct.get(r.productName) || 0) + 1);
    }
  }
  for (const [name, count] of byProduct) {
    console.log(`  ${name}: ${count} review(s)`);
  }

  console.log("\nReview seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Review seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

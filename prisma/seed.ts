import { PrismaClient, Category } from "@prisma/client";
import { productDescriptions } from "./product-descriptions";

const prisma = new PrismaClient();

/* ── Shared variant tiers (same across all products) ── */
const defaultVariants = [
  { weight: "1 gram", price: 10.0, sortOrder: 0 },
  { weight: "3 grams", price: 15.0, sortOrder: 1 },
  { weight: "15 grams", price: 29.99, originalPrice: 34.99, discount: "10%OFF", sortOrder: 2 },
  { weight: "28 grams", price: 44.99, originalPrice: 49.99, discount: "20%OFF", sortOrder: 3 },
];

/* ── Product data (ported from frontend src/data/products.ts) ── */
interface ProductSeed {
  name: string;
  salePrice: number;
  originalPrice: number;
  image: string;
  category: Category;
  thc: string;
  popularity: number;
}

const products: ProductSeed[] = [
  // ── INDICA (12) ──
  { name: "Pink Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/pink-kush.webp", category: "Indica", thc: "THCa 88%", popularity: 10 },
  { name: "Purple Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/purple-kush.webp", category: "Indica", thc: "THCa 90%", popularity: 8 },
  { name: "Island Pink", salePrice: 11.0, originalPrice: 16.0, image: "/strains/island-pink.webp", category: "Indica", thc: "THCa 87%", popularity: 6 },
  { name: "Death Bubba", salePrice: 12.0, originalPrice: 17.0, image: "/strains/death-bubba.webp", category: "Indica", thc: "THCa 92%", popularity: 9 },
  { name: "Black Cherry Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/black-cherry-kush.webp", category: "Indica", thc: "THCa 86%", popularity: 5 },
  { name: "Northern Lights", salePrice: 9.0, originalPrice: 14.0, image: "/strains/northern-lights.webp", category: "Indica", thc: "THCa 85%", popularity: 7 },
  { name: "Rockstar", salePrice: 11.0, originalPrice: 16.0, image: "/strains/rockstar.webp", category: "Indica", thc: "THCa 89%", popularity: 6 },
  { name: "Dosidos", salePrice: 10.0, originalPrice: 15.0, image: "/strains/dosidos.webp", category: "Indica", thc: "THCa 91%", popularity: 7 },
  { name: "Pine Tar", salePrice: 9.0, originalPrice: 14.0, image: "/strains/pine-tar.webp", category: "Indica", thc: "THCa 85%", popularity: 5 },
  { name: "Rootbeer Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/rootbeer-kush.webp", category: "Indica", thc: "THCa 87%", popularity: 4 },
  { name: "Purple Urkle", salePrice: 11.0, originalPrice: 16.0, image: "/strains/purple-urkle.webp", category: "Indica", thc: "THCa 88%", popularity: 6 },
  { name: "Cookies & Cream", salePrice: 12.0, originalPrice: 17.0, image: "/strains/cookies-cream.webp", category: "Indica", thc: "THCa 92%", popularity: 8 },

  // ── HYBRID (12) ──
  { name: "Pineapple Express", salePrice: 10.0, originalPrice: 15.0, image: "/strains/pineapple-express.webp", category: "Hybrid", thc: "THCa 88%", popularity: 9 },
  { name: "Gelato Cake", salePrice: 11.0, originalPrice: 16.0, image: "/strains/gelato-cake.webp", category: "Hybrid", thc: "THCa 90%", popularity: 9 },
  { name: "Rainbow Belt", salePrice: 10.0, originalPrice: 15.0, image: "/strains/rainbow-belt.webp", category: "Hybrid", thc: "THCa 87%", popularity: 7 },
  { name: "Blue Lobster", salePrice: 12.0, originalPrice: 17.0, image: "/strains/blue-lobster.webp", category: "Hybrid", thc: "THCa 91%", popularity: 10 },
  { name: "Orange Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/orange-kush.webp", category: "Hybrid", thc: "THCa 89%", popularity: 7 },
  { name: "Cherry Gelato", salePrice: 11.0, originalPrice: 16.0, image: "/strains/cherry-gelato.webp", category: "Hybrid", thc: "THCa 90%", popularity: 8 },
  { name: "Grape Cake", salePrice: 10.0, originalPrice: 15.0, image: "/strains/grape-cake.webp", category: "Hybrid", thc: "THCa 86%", popularity: 6 },
  { name: "Afghan Mints", salePrice: 12.0, originalPrice: 17.0, image: "/strains/afghan-mints.webp", category: "Hybrid", thc: "THCa 92%", popularity: 7 },
  { name: "Cherry Fritter", salePrice: 11.0, originalPrice: 16.0, image: "/strains/cherry-fritter.webp", category: "Hybrid", thc: "THCa 90%", popularity: 6 },
  { name: "Mandarin Zkittles", salePrice: 10.0, originalPrice: 15.0, image: "/strains/mandarin-zkittles.webp", category: "Hybrid", thc: "THCa 88%", popularity: 5 },
  { name: "Frumpz", salePrice: 11.0, originalPrice: 16.0, image: "/strains/frumpz.webp", category: "Hybrid", thc: "THCa 89%", popularity: 5 },
  { name: "Candy Chrome", salePrice: 12.0, originalPrice: 17.0, image: "/strains/candy-chrome.webp", category: "Hybrid", thc: "THCa 91%", popularity: 6 },

  // ── SATIVA (10) ──
  { name: "Lemonade OG", salePrice: 10.0, originalPrice: 15.0, image: "/strains/lemonade-og.webp", category: "Sativa", thc: "THCa 87%", popularity: 7 },
  { name: "Sour Apple", salePrice: 10.0, originalPrice: 15.0, image: "/strains/sour-apple.webp", category: "Sativa", thc: "THCa 89%", popularity: 8 },
  { name: "Blue Zkittlez", salePrice: 11.0, originalPrice: 16.0, image: "/strains/blue-zkittlez.webp", category: "Sativa", thc: "THCa 90%", popularity: 7 },
  { name: "Sour Pebbles", salePrice: 10.0, originalPrice: 15.0, image: "/strains/sour-pebbles.webp", category: "Sativa", thc: "THCa 86%", popularity: 5 },
  { name: "Sweet Skunk", salePrice: 9.0, originalPrice: 14.0, image: "/strains/sweet-skunk.webp", category: "Sativa", thc: "THCa 85%", popularity: 4 },
  { name: "Strawberry Mimosa", salePrice: 11.0, originalPrice: 16.0, image: "/strains/strawberry-mimosa.webp", category: "Sativa", thc: "THCa 91%", popularity: 7 },
  { name: "Peach Cream", salePrice: 10.0, originalPrice: 15.0, image: "/strains/peach-cream.webp", category: "Sativa", thc: "THCa 88%", popularity: 6 },
  { name: "Sunset Sherbet", salePrice: 12.0, originalPrice: 17.0, image: "/strains/sunset-sherbet.webp", category: "Sativa", thc: "THCa 91%", popularity: 8 },
  { name: "Watermelon Bubblegum", salePrice: 10.0, originalPrice: 15.0, image: "/strains/watermelon-bubblegum.webp", category: "Sativa", thc: "THCa 87%", popularity: 6 },
  { name: "Grape Haze", salePrice: 11.0, originalPrice: 16.0, image: "/strains/grape-haze.webp", category: "Sativa", thc: "THCa 90%", popularity: 6 },
];

/* ── Collection definitions (matching frontend curated subsets) ── */
const collections: { name: string; label: string; productNames: string[] }[] = [
  {
    name: "bestsellers",
    label: "Our Best Sellers",
    productNames: [
      "Purple Urkle", "Pink Kush", "Purple Kush", "Rainbow Belt",
      "Sour Apple", "Cherry Gelato", "Dosidos", "Pine Tar",
      "Rainbow Belt", "Sour Apple",
    ],
  },
  {
    name: "latest-drops",
    label: "Our Latest Drop",
    productNames: ["Orange Kush", "Blue Lobster", "Blue Zkittlez", "Grape Cake"],
  },
  {
    name: "find-your-resin",
    label: "Find Your Resin",
    productNames: [
      "Pink Kush", "Purple Kush", "Island Pink", "Pineapple Express",
      "Gelato Cake", "Lemonade OG", "Sour Apple", "Rainbow Belt",
    ],
  },
  {
    name: "you-will-also-like",
    label: "You Will Also Like",
    productNames: [
      "Orange Kush", "Cherry Gelato", "Blue Zkittlez",
      "Orange Kush", "Grape Cake", "Pink Kush",
    ],
  },
  {
    name: "upsell-pool",
    label: "You Might Also Like",
    productNames: [
      "Orange Kush", "Cherry Gelato", "Rainbow Belt", "Grape Cake",
      "Pineapple Express", "Pink Kush", "Sunset Sherbet", "Death Bubba",
      "Sour Apple", "Blue Zkittlez", "Gelato Cake", "Purple Urkle",
    ],
  },
  {
    name: "trending",
    label: "Trending Now",
    productNames: ["Blue Lobster", "Pink Kush", "Death Bubba", "Pineapple Express"],
  },
];

/* ── Slug helper ── */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ── Main seed function ── */
async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.productCollection.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.product.deleteMany();

  // Create products with variants
  const createdProducts: Map<string, string> = new Map(); // name -> id

  for (const p of products) {
    const desc = productDescriptions[p.name];
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        salePrice: p.salePrice,
        originalPrice: p.originalPrice,
        image: p.image,
        category: p.category,
        thc: p.thc,
        popularity: p.popularity,
        description: desc?.description ?? null,
        shortDesc: desc?.shortDesc ?? null,
        metaTitle: desc?.metaTitle ?? null,
        metaDescription: desc?.metaDescription ?? null,
        metaKeywords: desc?.metaKeywords ?? null,
        variants: {
          create: defaultVariants.map((v) => ({
            weight: v.weight,
            price: v.price,
            originalPrice: v.originalPrice ?? null,
            discount: v.discount ?? null,
            sortOrder: v.sortOrder,
          })),
        },
      },
    });
    createdProducts.set(p.name, product.id);
    console.log(`  Created product: ${p.name}`);
  }

  console.log(`\nCreated ${createdProducts.size} products.`);

  // Create collections
  for (const col of collections) {
    const collection = await prisma.collection.create({
      data: { name: col.name, label: col.label },
    });

    // Deduplicate product names while preserving order
    const seen = new Set<string>();
    const uniqueNames = col.productNames.filter((n) => {
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });

    for (let i = 0; i < uniqueNames.length; i++) {
      const productId = createdProducts.get(uniqueNames[i]);
      if (productId) {
        await prisma.productCollection.create({
          data: {
            productId,
            collectionId: collection.id,
            sortOrder: i,
          },
        });
      }
    }

    console.log(`  Created collection: ${col.name} (${uniqueNames.length} products)`);
  }

  console.log("\nSeed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

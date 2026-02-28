import { PrismaClient, Category } from "@prisma/client";

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
  { name: "Pink Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/pink-kush.png", category: "Indica", thc: "THC 28%", popularity: 10 },
  { name: "Purple Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/purple-kush.png", category: "Indica", thc: "THC 30%", popularity: 8 },
  { name: "Island Pink", salePrice: 11.0, originalPrice: 16.0, image: "/strains/island-pink.png", category: "Indica", thc: "THC 27%", popularity: 6 },
  { name: "Death Bubba", salePrice: 12.0, originalPrice: 17.0, image: "/strains/death-bubba.png", category: "Indica", thc: "THC 32%", popularity: 9 },
  { name: "Black Cherry Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/black-cherry-kush.png", category: "Indica", thc: "THC 26%", popularity: 5 },
  { name: "Northern Lights", salePrice: 9.0, originalPrice: 14.0, image: "/strains/northern-lights.png", category: "Indica", thc: "THC 25%", popularity: 7 },
  { name: "Rockstar", salePrice: 11.0, originalPrice: 16.0, image: "/strains/rockstar.png", category: "Indica", thc: "THC 29%", popularity: 6 },
  { name: "Dosidos", salePrice: 10.0, originalPrice: 15.0, image: "/strains/dosidos.png", category: "Indica", thc: "THC 31%", popularity: 7 },
  { name: "Pine Tar", salePrice: 9.0, originalPrice: 14.0, image: "/strains/pine-tar.png", category: "Indica", thc: "THC 24%", popularity: 5 },
  { name: "Rootbeer Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/rootbeer-kush.png", category: "Indica", thc: "THC 27%", popularity: 4 },
  { name: "Purple Urkle", salePrice: 11.0, originalPrice: 16.0, image: "/strains/purple-urkle.png", category: "Indica", thc: "THC 28%", popularity: 6 },
  { name: "Cookies & Cream", salePrice: 12.0, originalPrice: 17.0, image: "/strains/cookies-cream.png", category: "Indica", thc: "THC 33%", popularity: 8 },

  // ── HYBRID (12) ──
  { name: "Pineapple Express", salePrice: 10.0, originalPrice: 15.0, image: "/strains/pineapple-express.png", category: "Hybrid", thc: "THC 28%", popularity: 9 },
  { name: "Gelato Cake", salePrice: 11.0, originalPrice: 16.0, image: "/strains/gelato-cake.png", category: "Hybrid", thc: "THC 30%", popularity: 9 },
  { name: "Rainbow Belt", salePrice: 10.0, originalPrice: 15.0, image: "/strains/rainbow-belt.png", category: "Hybrid", thc: "THC 27%", popularity: 7 },
  { name: "Blue Lobster", salePrice: 12.0, originalPrice: 17.0, image: "/strains/blue-lobster.png", category: "Hybrid", thc: "THC 32%", popularity: 10 },
  { name: "Orange Kush", salePrice: 10.0, originalPrice: 15.0, image: "/strains/orange-kush.png", category: "Hybrid", thc: "THC 29%", popularity: 7 },
  { name: "Cherry Gelato", salePrice: 11.0, originalPrice: 16.0, image: "/strains/cherry-gelato.png", category: "Hybrid", thc: "THC 31%", popularity: 8 },
  { name: "Grape Cake", salePrice: 10.0, originalPrice: 15.0, image: "/strains/grape-cake.png", category: "Hybrid", thc: "THC 26%", popularity: 6 },
  { name: "Afghan Mints", salePrice: 12.0, originalPrice: 17.0, image: "/strains/afghan-mints.png", category: "Hybrid", thc: "THC 34%", popularity: 7 },
  { name: "Cherry Fritter", salePrice: 11.0, originalPrice: 16.0, image: "/strains/cherry-fritter.png", category: "Hybrid", thc: "THC 30%", popularity: 6 },
  { name: "Mandarin Zkittles", salePrice: 10.0, originalPrice: 15.0, image: "/strains/mandarin-zkittles.png", category: "Hybrid", thc: "THC 28%", popularity: 5 },
  { name: "Frumpz", salePrice: 11.0, originalPrice: 16.0, image: "/strains/frumpz.png", category: "Hybrid", thc: "THC 29%", popularity: 5 },
  { name: "Candy Chrome", salePrice: 12.0, originalPrice: 17.0, image: "/strains/candy-chrome.png", category: "Hybrid", thc: "THC 33%", popularity: 6 },

  // ── SATIVA (10) ──
  { name: "Lemonade OG", salePrice: 10.0, originalPrice: 15.0, image: "/strains/lemonade-og.png", category: "Sativa", thc: "THC 27%", popularity: 7 },
  { name: "Sour Apple", salePrice: 10.0, originalPrice: 15.0, image: "/strains/sour-apple.png", category: "Sativa", thc: "THC 29%", popularity: 8 },
  { name: "Blue Zkittlez", salePrice: 11.0, originalPrice: 16.0, image: "/strains/blue-zkittlez.png", category: "Sativa", thc: "THC 30%", popularity: 7 },
  { name: "Sour Pebbles", salePrice: 10.0, originalPrice: 15.0, image: "/strains/sour-pebbles.png", category: "Sativa", thc: "THC 26%", popularity: 5 },
  { name: "Sweet Skunk", salePrice: 9.0, originalPrice: 14.0, image: "/strains/sweet-skunk.png", category: "Sativa", thc: "THC 24%", popularity: 4 },
  { name: "Strawberry Mimosa", salePrice: 11.0, originalPrice: 16.0, image: "/strains/strawberry-mimosa.png", category: "Sativa", thc: "THC 31%", popularity: 7 },
  { name: "Peach Cream", salePrice: 10.0, originalPrice: 15.0, image: "/strains/peach-cream.png", category: "Sativa", thc: "THC 28%", popularity: 6 },
  { name: "Sunset Sherbet", salePrice: 12.0, originalPrice: 17.0, image: "/strains/sunset-sherbet.png", category: "Sativa", thc: "THC 32%", popularity: 8 },
  { name: "Watermelon Bubblegum", salePrice: 10.0, originalPrice: 15.0, image: "/strains/watermelon-bubblegum.png", category: "Sativa", thc: "THC 27%", popularity: 6 },
  { name: "Grape Haze", salePrice: 11.0, originalPrice: 16.0, image: "/strains/grape-haze.png", category: "Sativa", thc: "THC 30%", popularity: 6 },
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

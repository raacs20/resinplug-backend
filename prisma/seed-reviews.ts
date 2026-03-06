/**
 * seed-reviews.ts
 *
 * Generates 50–100 unique, realistic reviews for each of the 34 live-resin
 * products. Every review is deterministic (seeded PRNG) and fully unique —
 * no review text is reused across products.
 *
 * Run:  npx tsx prisma/seed-reviews.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* ================================================================
   TYPES
   ================================================================ */

export interface SeedReview {
  productId: string;
  customerName: string;
  rating: number;
  title: string | null;
  text: string;
  verified: boolean;
  helpfulCount: number;
  createdAt: Date;
}

/* ================================================================
   DETERMINISTIC PRNG — mulberry32
   ================================================================ */

function mulberry32(seed: number) {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260306;
let rng = mulberry32(SEED);

function rand(): number {
  return rng();
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ================================================================
   CUSTOMER NAMES (200+ unique)
   ================================================================ */

const FIRST_NAMES = [
  "Mike", "Sarah", "DeShawn", "Aisha", "Tyler", "Jessica", "Marcus", "Emily",
  "Jamal", "Ashley", "Brandon", "Megan", "Chris", "Nicole", "Kevin", "Rachel",
  "David", "Stephanie", "Ryan", "Amanda", "Justin", "Lauren", "Andrew", "Brittany",
  "Jason", "Amber", "Josh", "Heather", "Matt", "Kayla", "Jake", "Tiffany",
  "Alex", "Samantha", "Cody", "Danielle", "Trevor", "Michelle", "Dylan", "Christina",
  "Zach", "Courtney", "Luke", "Melissa", "Austin", "Vanessa", "Hunter", "Rebecca",
  "Ethan", "Jasmine", "Noah", "Diamond", "Mason", "Aaliyah", "Logan", "Destiny",
  "Caleb", "Savannah", "Owen", "Brooke", "Liam", "Paige", "Nathan", "Kennedy",
  "Isaac", "Jade", "Eli", "Sierra", "Adrian", "Autumn", "Dominic", "Faith",
  "Isaiah", "Skyler", "Xavier", "Morgan", "Dante", "Taylor", "Tristan", "Jordan",
  "Gavin", "Alexis", "Roman", "Madison", "Victor", "Hailey", "Ray", "Kenzie",
  "Carlos", "Sofia", "Diego", "Valentina", "Marco", "Camila", "Luis", "Adriana",
  "Jorge", "Carmen", "Mateo", "Lucia", "Pedro", "Daniela", "Ravi", "Priya",
  "Arjun", "Neha", "Vikram", "Ananya", "Sanjay", "Meera", "Wei", "Lin",
  "Kenji", "Yuki", "Tao", "Min", "Jin", "Hana", "Kofi", "Amara",
  "Kwame", "Nia", "Tariq", "Layla", "Omar", "Fatima", "Rashid", "Zara",
  "Hakeem", "Imani", "Terrence", "Ebony", "Jerome", "Keisha", "Darnell", "Tamika",
  "Andre", "Monique", "Tyrone", "Latasha", "Reggie", "Shanice", "Sean", "Brianna",
  "Patrick", "Colleen", "Connor", "Sienna", "Declan", "Isla", "Finn", "Nora",
  "Luca", "Mia", "Enzo", "Aria", "Henrik", "Freya", "Sven", "Ingrid",
  "Nikolai", "Katya", "Dimitri", "Anya", "Pavel", "Natasha", "Ivan", "Svetlana",
  "Beau", "Scarlett", "Wyatt", "Hazel", "Bodhi", "Willow", "Kai", "Luna",
  "Jace", "Piper", "Maverick", "Quinn", "Atlas", "Wren", "Phoenix", "Sage",
  "River", "Aspen", "Sterling", "Eden", "Cruz", "Nova", "Axel", "Cora",
  "Beckett", "Ivy", "Rowan", "Fern", "Holden", "Daphne", "Lennox", "Lydia",
  "Grant", "Elise", "Spencer", "Clara", "Trent", "Vera", "Blake", "Stella",
  "Corey", "Ruby", "Nate", "Olive", "Todd", "Iris", "Brett", "Violet",
  "Devin", "Rose", "Shawn", "Pearl", "Craig", "Opal", "Glen", "Gwen",
  "Kirk", "June", "Dean", "Mae", "Neil", "Joy", "Dale", "Hope",
];

const LAST_INITIALS = "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z".split(" ");

function generateNames(count: number): string[] {
  const names: string[] = [];
  const used = new Set<string>();
  const shuffledFirsts = shuffle(FIRST_NAMES);
  let idx = 0;
  while (names.length < count) {
    const first = shuffledFirsts[idx % shuffledFirsts.length];
    const last = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)];
    const name = `${first} ${last}.`;
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
    idx++;
  }
  return names;
}

/* ================================================================
   PRODUCT DATA
   ================================================================ */

interface ProductConfig {
  name: string;
  category: "Indica" | "Hybrid" | "Sativa";
  effects: string;
  flavors: string[];
}

const PRODUCTS: ProductConfig[] = [
  // INDICA
  { name: "Pink Kush", category: "Indica", effects: "Relaxed, Sleepy, Euphoric", flavors: ["vanilla", "berry", "cotton candy", "floral", "earthy pine"] },
  { name: "Purple Kush", category: "Indica", effects: "Sedated, Pain Relief, Calm", flavors: ["grape", "berry", "earthy", "spicy", "hashish"] },
  { name: "Island Pink", category: "Indica", effects: "Relaxed, Euphoric, Hungry", flavors: ["sweet", "floral", "grapefruit", "vanilla", "woody"] },
  { name: "Death Bubba", category: "Indica", effects: "Sedated, Sleepy, Pain Relief", flavors: ["earthy", "pine", "pungent", "musky", "spicy"] },
  { name: "Black Cherry Kush", category: "Indica", effects: "Calm, Sleepy, Pain Relief", flavors: ["cherry", "dark fruit", "earthy", "sweet", "woody"] },
  { name: "Northern Lights", category: "Indica", effects: "Relaxed, Calm, Sleepy", flavors: ["sweet", "piney", "earthy", "spicy", "herbal"] },
  { name: "Rockstar", category: "Indica", effects: "Euphoric, Sedated, Pain Relief", flavors: ["skunky", "spicy", "earthy", "grape", "pungent"] },
  { name: "Dosidos", category: "Indica", effects: "Euphoric, Creative, Relaxed", flavors: ["minty", "earthy", "lime", "floral", "cookie dough"] },
  { name: "Pine Tar", category: "Indica", effects: "Calm, Relaxed, Pain Relief", flavors: ["pine", "woody", "earthy", "sweet", "resinous"] },
  { name: "Rootbeer Kush", category: "Indica", effects: "Happy, Relaxed, Hungry", flavors: ["root beer", "vanilla", "herbal", "sweet", "earthy"] },
  { name: "Purple Urkle", category: "Indica", effects: "Calm, Sleepy, Happy", flavors: ["grape", "berry", "candy", "tropical", "skunky"] },
  { name: "Cookies & Cream", category: "Indica", effects: "Euphoric, Creative, Sedated", flavors: ["vanilla", "cookie", "creamy", "sweet", "nutty"] },
  // HYBRID
  { name: "Pineapple Express", category: "Hybrid", effects: "Creative, Focused, Uplifted", flavors: ["pineapple", "tropical", "citrus", "cedar", "mango"] },
  { name: "Gelato Cake", category: "Hybrid", effects: "Euphoric, Creative, Relaxed", flavors: ["creamy", "sweet", "vanilla", "fruity", "lavender"] },
  { name: "Rainbow Belt", category: "Hybrid", effects: "Happy, Creative, Uplifted", flavors: ["candy", "fruity", "citrus", "tropical", "sweet"] },
  { name: "Blue Lobster", category: "Hybrid", effects: "Creative, Tingly, Balanced", flavors: ["blueberry", "earthy", "sweet", "herbal", "creamy"] },
  { name: "Orange Kush", category: "Hybrid", effects: "Uplifted, Happy, Relaxed", flavors: ["orange", "citrus", "sweet", "earthy", "tangy"] },
  { name: "Cherry Gelato", category: "Hybrid", effects: "Euphoric, Creative, Uplifted", flavors: ["cherry", "creamy", "sweet", "fruity", "earthy"] },
  { name: "Grape Cake", category: "Hybrid", effects: "Happy, Relaxed, Hungry", flavors: ["grape", "sweet", "vanilla", "berry", "doughy"] },
  { name: "Afghan Mints", category: "Hybrid", effects: "Focused, Creative, Relaxed", flavors: ["mint", "earthy", "herbal", "spicy", "sweet"] },
  { name: "Cherry Fritter", category: "Hybrid", effects: "Euphoric, Happy, Creative", flavors: ["cherry", "doughy", "sweet", "cinnamon", "earthy"] },
  { name: "Mandarin Zkittles", category: "Hybrid", effects: "Happy, Uplifted, Creative", flavors: ["mandarin", "citrus", "candy", "tropical", "sweet"] },
  { name: "Frumpz", category: "Hybrid", effects: "Focused, Creative, Balanced", flavors: ["fruity", "sweet", "creamy", "berry", "tropical"] },
  { name: "Candy Chrome", category: "Hybrid", effects: "Euphoric, Focused, Creative", flavors: ["sweet", "candy", "citrus", "creamy", "fruity"] },
  // SATIVA
  { name: "Lemonade OG", category: "Sativa", effects: "Focused, Motivated, Energetic", flavors: ["lemon", "citrus", "sweet", "tangy", "earthy"] },
  { name: "Sour Apple", category: "Sativa", effects: "Energetic, Focused, Euphoric", flavors: ["sour apple", "tart", "sweet", "earthy", "fruity"] },
  { name: "Blue Zkittlez", category: "Sativa", effects: "Euphoric, Happy, Creative", flavors: ["berry", "candy", "sweet", "tropical", "fruity"] },
  { name: "Sour Pebbles", category: "Sativa", effects: "Uplifted, Happy, Focused", flavors: ["fruity", "cereal", "tart", "sweet", "citrus"] },
  { name: "Sweet Skunk", category: "Sativa", effects: "Focused, Creative, Energetic", flavors: ["skunky", "sweet", "earthy", "citrus", "herbal"] },
  { name: "Strawberry Mimosa", category: "Sativa", effects: "Euphoric, Energetic, Uplifted", flavors: ["strawberry", "champagne", "citrus", "sweet", "floral"] },
  { name: "Peach Cream", category: "Sativa", effects: "Creative, Uplifted, Calm", flavors: ["peach", "creamy", "sweet", "fruity", "vanilla"] },
  { name: "Sunset Sherbet", category: "Sativa", effects: "Creative, Euphoric, Focused", flavors: ["sherbet", "citrus", "berry", "sweet", "creamy"] },
  { name: "Watermelon Bubblegum", category: "Sativa", effects: "Happy, Uplifted, Energetic", flavors: ["watermelon", "bubblegum", "sweet", "fruity", "candy"] },
  { name: "Grape Haze", category: "Sativa", effects: "Creative, Focused, Motivated", flavors: ["grape", "hazy", "sweet", "earthy", "berry"] },
];

/* ================================================================
   SLUG HELPER
   ================================================================ */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ================================================================
   REVIEW TEMPLATE FRAGMENTS
   Each category has large pools of openers, bodies, closers.
   Product-specific tokens: {NAME}, {FLAVOR1}, {FLAVOR2}, {EFFECT1},
   {EFFECT2}, {CATEGORY}
   ================================================================ */

// ── MEGA SHORT (2-5 words) ──

const MEGA_SHORT_5STAR = [
  "Fire",
  "So good",
  "Best stuff ever",
  "Amazing resin",
  "Love it!!",
  "10/10 would buy again",
  "Absolutely incredible",
  "Perfect every time",
  "Can't get enough",
  "Pure gold",
  "Top shelf quality",
  "This is it",
  "Wow just wow",
  "My new favorite",
  "Straight fire",
  "Insanely good",
  "Best purchase ever",
  "No complaints here",
  "Phenomenal stuff",
  "A must try",
  "Unreal quality",
  "Obsessed with this",
  "The real deal",
  "Hands down amazing",
  "Never disappoints",
  "Best I've had",
  "Simply the best",
  "Total game changer",
  "Worth every penny",
  "Blown away",
  "This hits different",
  "Beyond impressed",
  "Next level stuff",
  "So so good",
  "Nothing compares",
  "Seriously amazing",
  "Exactly what I needed",
  "Chef's kiss",
  "Outstanding quality",
  "Can't stop ordering",
  "Best in the game",
  "Highly recommend",
  "Top notch",
  "Absolutely love this",
  "Super impressed",
  "Just perfect",
  "Incredible stuff",
  "Order this now",
  "Best resin period",
  "SO GOOD",
  "Literal perfection",
  "Flawless product",
  "Yes yes yes",
  "Mind blown",
  "GOAT resin",
  "Amazing quality!!",
  "Legit the best",
  "Five stars easy",
  "Perfect 10",
  "Couldn't be happier",
];

const MEGA_SHORT_4STAR = [
  "Pretty solid",
  "Good stuff overall",
  "Really nice quality",
  "Almost perfect",
  "Very good",
  "Solid product",
  "Would buy again",
  "Not bad at all",
  "Quite impressed",
  "Definitely recommend",
];

// ── STRAIN-SPECIFIC FLAVOR TEMPLATES ──

const FLAVOR_OPENERS = [
  "The {FLAVOR1} flavor on this {NAME} is absolutely incredible.",
  "If you love {FLAVOR1} you need to try this {NAME} immediately.",
  "The {FLAVOR1} and {FLAVOR2} notes really come through on this one.",
  "Honestly the {FLAVOR1} taste on the {NAME} blew me away.",
  "The flavor profile on this {NAME} is insane, you can really taste the {FLAVOR1}.",
  "I picked this up for the {FLAVOR1} flavor and I was not disappointed.",
  "First thing I noticed was that {FLAVOR1} taste and I was hooked.",
  "This {NAME} resin has the most amazing {FLAVOR1} flavor I've ever experienced.",
  "The {FLAVOR1} and {FLAVOR2} combo in this {NAME} is chef's kiss.",
  "You can really taste the {FLAVOR1} in every hit of this {NAME}.",
  "That {FLAVOR1} flavor hits you right away with the {NAME}.",
  "The {NAME} has this beautiful {FLAVOR1} taste that's smooth and clean.",
  "I'm a sucker for {FLAVOR1} strains and this {NAME} delivers hard.",
  "Just cracked open my {NAME} order and the {FLAVOR1} smell is unbelievable.",
  "The terp profile on this {NAME} is dominated by {FLAVOR1} and {FLAVOR2} and it's perfect.",
  "Smooth {FLAVOR1} flavor that lingers on the exhale. Love this {NAME}.",
  "Every time I open the jar the {FLAVOR1} aroma from this {NAME} fills the room.",
  "This {NAME} tastes exactly like {FLAVOR1} with hints of {FLAVOR2}. So good.",
  "If you want a resin that actually tastes like {FLAVOR1} this is the one.",
  "Tried a bunch of {CATEGORY} strains and the {NAME} has the best {FLAVOR1} flavor by far.",
  "The {FLAVOR2} undertone in this {NAME} really rounds out the {FLAVOR1} nicely.",
  "Never had a resin that captures {FLAVOR1} this well. The {NAME} is special.",
  "Got the {NAME} specifically because I love {FLAVOR1} flavors and it exceeded expectations.",
  "The exhale on this {NAME} has this beautiful {FLAVOR1} {FLAVOR2} taste.",
  "Super terpy {NAME}. The {FLAVOR1} is front and center with a {FLAVOR2} finish.",
];

const FLAVOR_BODIES = [
  "The taste stays smooth from start to finish.",
  "Really clean on the throat too which I appreciate.",
  "Reminds me of the best {CATEGORY} I've ever had.",
  "The consistency is perfect and the color is golden.",
  "I've been through half the jar already and every dab is consistent.",
  "Tastes even better than it smells honestly.",
  "It's the kind of flavor that makes you stop and appreciate it.",
  "The terps are preserved perfectly in this batch.",
  "I keep coming back to this one over everything else in my stash.",
  "My friends tried it and now they all want to order.",
  "Just an incredibly well made product all around.",
  "This is what live resin should taste like.",
  "The flavor doesn't burn off quick either, it lasts.",
  "I've tried cheaper options and nothing comes close to this.",
  "Even at low temps the flavor is bursting.",
];

const FLAVOR_CLOSERS = [
  "Definitely ordering more.",
  "Already placed my second order for this.",
  "This is going to be my go-to from now on.",
  "Five stars all the way.",
  "Would recommend to anyone who appreciates good flavor.",
  "Resinplug nailed it with this one.",
  "Can't wait to try more strains from here.",
  "This one's a keeper for sure.",
  "Will be stocking up on this one.",
  "Easily one of the best I've had this year.",
  "Highly highly recommend this strain.",
  "ResinPlug has a customer for life with this one.",
  "I'll be telling all my friends about this.",
  "This is premium quality at a fair price.",
  "You won't regret ordering this trust me.",
];

// ── EFFECTS-FOCUSED TEMPLATES ──

const EFFECTS_OPENERS = [
  "The {NAME} had me feeling {EFFECT1} within minutes.",
  "If you're looking for something that makes you feel {EFFECT1} this is your strain.",
  "The effects of this {NAME} are exactly as described: {EFFECT1} and {EFFECT2}.",
  "I use {CATEGORY} for the {EFFECT1} effects and this {NAME} delivers perfectly.",
  "The {EFFECT1} effect from this {NAME} is real and it kicks in fast.",
  "Was looking for something {EFFECT1} and this {NAME} exceeded my expectations.",
  "The {NAME} gives you this nice {EFFECT1} feeling without being overwhelming.",
  "Tried this {NAME} after work and immediately felt {EFFECT1}.",
  "This {NAME} is my go-to when I need to feel {EFFECT1}.",
  "The {EFFECT1} and {EFFECT2} combo from the {NAME} is exactly what I wanted.",
  "Perfect for winding down. The {NAME} makes me feel super {EFFECT1}.",
  "I've been using {NAME} for the {EFFECT1} effects and it hasn't let me down.",
  "Exactly what I needed. The {NAME} had me feeling {EFFECT1} all evening.",
  "Super {EFFECT1} vibes from this {NAME}. Great for relaxation.",
  "This {NAME} is like a wave of {EFFECT1} that just washes over you.",
];

const EFFECTS_BODIES = [
  "Lasted a good couple hours too which is nice.",
  "Not too intense either, just the right level.",
  "Perfect for my evening routine.",
  "I've been sleeping so much better since I started using this.",
  "Really helps take the edge off after a long day.",
  "Great for both solo sessions and hanging with friends.",
  "The effects are smooth and gradual, no sudden peak.",
  "It builds up nicely and just keeps you in that sweet spot.",
  "My partner noticed I was way more chill after trying this.",
  "Use it regularly now and the effects stay consistent batch to batch.",
  "Pairs really well with music and movies.",
  "Perfect balance of body and mind effects.",
  "Didn't expect it to be this potent honestly.",
  "Great for managing my stress levels throughout the week.",
  "The effects are really well balanced.",
];

const EFFECTS_CLOSERS = [
  "Highly recommend for anyone chasing that {EFFECT1} vibe.",
  "This is staying in my regular rotation.",
  "Already ordered a backup jar.",
  "Can't recommend this enough for {EFFECT1} seekers.",
  "You won't be disappointed with this one.",
  "Perfect {CATEGORY} for the effect profile.",
  "This strain really delivers on its promises.",
  "Going to try other strains too but this one's hard to beat.",
  "Solid pick if you want reliable {EFFECT1} effects.",
  "10 out of 10 would recommend.",
];

// ── SHIPPING / DELIVERY TEMPLATES ──

const SHIPPING_OPENERS = [
  "Order arrived in just 2 days which was awesome.",
  "Shipped super fast and packaging was perfect.",
  "Got my {NAME} delivered in record time.",
  "Shipping was incredibly fast, had it within 3 days.",
  "Placed my order Monday and it was at my door by Wednesday.",
  "Impressed with how quickly my {NAME} arrived.",
  "The delivery was fast, discreet, and professional.",
  "Tracking worked perfectly and it arrived exactly when estimated.",
  "Fastest shipping I've experienced from any online shop.",
  "Package came in perfect condition and super discreet.",
  "My order of {NAME} showed up way faster than expected.",
  "2-day shipping and the packaging was airtight and secure.",
  "Delivery was seamless. No issues whatsoever.",
  "Really impressed with the turnaround time on my order.",
  "Got the shipping notification same day I ordered.",
];

const SHIPPING_BODIES = [
  "Everything was sealed up tight and the product was in perfect condition.",
  "Packaging was very discreet, nobody would know what's inside.",
  "The box was well padded and the jar was sealed perfectly.",
  "No damage, no leaks, everything was exactly as expected.",
  "They even threw in some stickers which was a nice touch.",
  "The vacuum seal was still intact which shows they care about freshness.",
  "Product was cold to the touch when it arrived so I know it was stored properly.",
  "Really professional packaging, feels like a premium experience.",
  "Zero complaints about the shipping process.",
  "Everything matched what I ordered, quantities were accurate.",
];

const SHIPPING_CLOSERS = [
  "Will definitely be ordering again soon.",
  "Great experience from order to delivery.",
  "ResinPlug really has their logistics dialed in.",
  "This is how online ordering should work.",
  "Fast shipping + great product = happy customer.",
  "Already recommended to my friends based on the shipping alone.",
  "Smooth process from start to finish.",
  "They've earned my repeat business for sure.",
  "Can't beat this level of service.",
  "Everything about this purchase was top notch.",
];

// ── VALUE / PRICE TEMPLATES ──

const VALUE_OPENERS = [
  "For the price you really can't beat this {NAME}.",
  "Best deal I've found on quality {CATEGORY} resin.",
  "The value here is insane. This {NAME} is priced so fairly.",
  "I've been overpaying elsewhere for worse quality than this {NAME}.",
  "Honestly shocked at how good this {NAME} is for the price.",
  "Price to quality ratio on this {NAME} is unmatched.",
  "Been looking for affordable quality and this {NAME} is exactly that.",
  "Way better value than dispensary prices for this level of quality.",
  "This {NAME} punches way above its price point.",
  "Can't believe how much product you get for the price.",
  "The bulk pricing on the {NAME} is a steal.",
  "Compared to what I used to pay this is an absolute bargain.",
  "Dollar for dollar the best resin I've purchased.",
  "Great quality at an even better price.",
  "This {NAME} is honestly underpriced for what you get.",
];

const VALUE_BODIES = [
  "The quality is easily on par with stuff I've paid double for.",
  "I grabbed the bigger size and the savings are significant.",
  "Every gram is consistent quality too, no filler.",
  "My wallet and my lungs are both happy.",
  "I've tried budget options and premium options and this hits the sweet spot.",
  "The 28g option is especially good value.",
  "You're getting top shelf at mid shelf prices.",
  "Considering the quality this should cost more honestly.",
  "I've switched from my previous supplier entirely because of the pricing here.",
  "The discounts they run make it even more affordable.",
];

const VALUE_CLOSERS = [
  "Best bang for your buck period.",
  "Save yourself the headache and just order from here.",
  "My wallet thanks me for finding ResinPlug.",
  "Great quality doesn't have to break the bank.",
  "Couldn't be happier with this purchase.",
  "If you're on a budget this is the move.",
  "Smart money buys from ResinPlug.",
  "This is where value meets quality.",
  "Best money I've spent in a while.",
  "You'd be crazy not to try this at this price.",
];

// ── QUALITY / APPEARANCE TEMPLATES ──

const QUALITY_OPENERS = [
  "The consistency on this {NAME} is absolutely perfect.",
  "Opened the jar and the {NAME} was this gorgeous golden color.",
  "First thing I noticed was the beautiful amber color of this {NAME}.",
  "The quality of this {NAME} resin is immediately obvious when you see it.",
  "Super terpy and the texture is just right on this {NAME}.",
  "This {NAME} has the most beautiful golden clarity I've seen in a resin.",
  "The {NAME} came looking like actual liquid gold.",
  "You can tell this is quality stuff just from looking at it.",
  "The shatter-like consistency of this {NAME} is perfect for dabbing.",
  "Gorgeous color and amazing terp profile on this {NAME}.",
  "This batch of {NAME} has incredible clarity and a rich amber tone.",
  "The consistency is smooth and buttery, not dry at all.",
  "First impression: this {NAME} looks and smells premium.",
  "Real live resin quality here. The {NAME} is glistening and terpy.",
  "The texture of this {NAME} is perfect, easy to work with.",
];

const QUALITY_BODIES = [
  "Dabs clean with zero residue left behind.",
  "The smell alone when you open the jar is worth it.",
  "Melts perfectly at the right temperature.",
  "No dark spots, no impurities, just pure quality.",
  "The terpene preservation is clearly top notch here.",
  "You can see the terp layer and it's beautiful.",
  "Really clean product, clearly well processed.",
  "The aroma fills the entire room as soon as you crack the seal.",
  "Smooth vapor production and clean finish.",
  "I've seen a lot of resin and this is top tier quality.",
];

const QUALITY_CLOSERS = [
  "This is what premium resin looks like.",
  "ResinPlug clearly knows what they're doing.",
  "Quality speaks for itself with this one.",
  "Can't fake this level of quality.",
  "Impressed from the moment I opened the jar.",
  "Outstanding craftsmanship on this product.",
  "The quality is undeniable.",
  "Set the standard for what I expect now.",
  "Pure quality through and through.",
  "If you care about quality this is the one.",
];

// ── REPEAT CUSTOMER TEMPLATES ──

const REPEAT_OPENERS = [
  "This is my third time ordering the {NAME} and it's consistent every time.",
  "Back for my fourth order now. The {NAME} never disappoints.",
  "I've been ordering from ResinPlug for months now and the {NAME} is always on point.",
  "Lost count of how many times I've ordered this {NAME} at this point.",
  "Another order, another win. The {NAME} is always fire.",
  "I keep coming back to the {NAME} because nothing else compares.",
  "This is probably my fifth or sixth jar of {NAME} from ResinPlug.",
  "Repeat customer here and the quality hasn't dipped once.",
  "Been loyal to ResinPlug since day one and the {NAME} is why.",
  "Every batch of {NAME} I've received has been excellent.",
  "Ordering the {NAME} again because it's just that good.",
  "My second order of {NAME} and it's just as good as the first.",
  "I've tried other suppliers but I always come back to ResinPlug for my {NAME}.",
  "Third jar of this {NAME} and the consistency is remarkable.",
  "Loyal customer for 6+ months now. The {NAME} keeps me coming back.",
];

const REPEAT_BODIES = [
  "The quality has been consistent across every single order.",
  "I've tried probably 10 different strains from here and they're all great.",
  "Even tried a few other suppliers in between but ResinPlug is just better.",
  "I now order the 28g size because I go through it so fast.",
  "Started with a small order to test and now I'm a regular.",
  "My friends all order from here now too thanks to me.",
  "The fact that it's always the same high quality is what keeps me loyal.",
  "I've turned into a bit of an evangelist for ResinPlug at this point.",
  "Consistency is key and they deliver every single time.",
  "Every order arrives fast and the product is always on point.",
];

const REPEAT_CLOSERS = [
  "Customer for life right here.",
  "Will keep ordering as long as they keep making it.",
  "They've earned every penny of my repeat business.",
  "If you're wondering whether to order, just do it. You'll be back.",
  "Already planning my next order.",
  "Going to try a few more strains next time too.",
  "Couldn't imagine going anywhere else at this point.",
  "They've set the bar too high for anyone else.",
  "Once you try it you'll understand why I keep ordering.",
  "See you on my next order ResinPlug!",
];

// ── GENERAL PRAISE TEMPLATES ──

const GENERAL_OPENERS = [
  "Really happy with my {NAME} order from ResinPlug.",
  "Just received my {NAME} and I'm very impressed.",
  "Tried the {NAME} for the first time and it did not disappoint.",
  "So glad I decided to order the {NAME}.",
  "The {NAME} from ResinPlug is the real deal.",
  "Gave the {NAME} a shot and wow, very impressed.",
  "First time trying {NAME} live resin and this is top tier.",
  "Heard good things about {NAME} and they were all true.",
  "Finally got around to ordering the {NAME} and I'm glad I did.",
  "ResinPlug coming through again with the {NAME}.",
  "Great experience with the {NAME} all around.",
  "The {NAME} is everything I hoped it would be.",
  "Pleasantly surprised by the {NAME}.",
  "Can't say enough good things about this {NAME}.",
  "Very satisfied with my {NAME} purchase.",
  "This {NAME} is exactly what I was looking for.",
  "Solid choice going with the {NAME}.",
  "No regrets ordering the {NAME}.",
  "The {NAME} exceeded my expectations honestly.",
  "Impressed with both the product and the service.",
];

const GENERAL_BODIES = [
  "Everything about it is just right.",
  "It's smooth, tasty, and potent. What more could you ask for.",
  "I've recommended this to a few friends already.",
  "This is what I expect from a quality product.",
  "ResinPlug clearly puts care into their products.",
  "The whole experience from ordering to using has been great.",
  "Quality product backed by quality service.",
  "I was a little skeptical ordering online but these guys are legit.",
  "It hits just right every single time.",
  "Glad I found ResinPlug, this is my new go-to shop.",
  "No issues whatsoever with the product or the ordering process.",
  "The quality is noticeably better than other places I've tried.",
  "I'm genuinely impressed with what they put out.",
  "Really solid product that delivers on every front.",
  "From the packaging to the product itself everything is A+.",
];

const GENERAL_CLOSERS = [
  "Will be ordering again for sure.",
  "Highly recommend to anyone looking for quality resin.",
  "Five stars, no question about it.",
  "You won't be disappointed.",
  "Great job ResinPlug, keep it up.",
  "Adding this to my regular rotation.",
  "Earned a new loyal customer.",
  "Going to explore more of their menu next time.",
  "Already eyeing my next order.",
  "Two thumbs up from me.",
  "Easily recommend this to anyone.",
  "Keep up the great work!",
  "This is how it's done.",
  "ResinPlug for the win.",
  "Definitely coming back for more.",
];

// ── 4-STAR REVIEW TEMPLATES ──

const FOURSTAR_OPENERS = [
  "Overall really happy with my {NAME} order.",
  "The {NAME} is great quality, just a couple small things.",
  "Solid product overall, the {NAME} is good.",
  "Really like the {NAME}, giving it 4 stars because of one thing.",
  "Good experience with the {NAME} for the most part.",
  "The {NAME} is a quality product no doubt.",
  "Enjoyed the {NAME} quite a bit.",
  "The {NAME} is definitely worth ordering.",
  "Pretty impressed with the {NAME} overall.",
  "Nothing major to complain about with the {NAME}.",
  "The {NAME} from ResinPlug is solid.",
  "Good stuff overall, the {NAME} delivers.",
  "Had a good experience with the {NAME}.",
  "The {NAME} is a strong product for sure.",
  "No regrets ordering the {NAME}.",
];

const FOURSTAR_ISSUES = [
  "Only reason I'm not giving 5 stars is shipping took an extra day.",
  "Wish it came in bigger sizes though.",
  "The consistency was a tiny bit dry compared to what I expected.",
  "Would love to see a loyalty program or something for repeat buyers.",
  "Packaging could be slightly more airtight in my opinion.",
  "Took a little longer to arrive than the estimated time.",
  "I've had slightly better from them in previous orders.",
  "The flavor was good but not as strong as I hoped.",
  "Only thing I'd change is adding more size options.",
  "It's good but I've had better batches of {CATEGORY} from here.",
  "Just a touch less potent than my last order.",
  "One small thing: the jar was a bit hard to open.",
  "Would be 5 stars if the effects lasted just a bit longer.",
  "Good but the terp profile wasn't quite as pronounced as I expected.",
  "Solid but I think the {NAME} could use a tiny bit more cure time.",
  "Quality is there but I wish they included a dab tool or something.",
  "Only minor gripe is the label on the jar was slightly crooked.",
  "Great product, just wish the price was a tiny bit lower.",
  "Almost perfect, the texture was just slightly off from ideal.",
  "Shipping was good but tracking updates were a bit slow.",
];

const FOURSTAR_CLOSERS = [
  "Still a great product though, would order again.",
  "Minor nitpick aside this is quality stuff.",
  "Would still recommend to anyone.",
  "Not a dealbreaker by any means.",
  "Overall very happy and will reorder.",
  "Solid 4 out of 5 from me.",
  "Looking forward to trying other strains from them.",
  "Will give 5 stars next time if they fix that one thing.",
  "Still one of the better options out there.",
  "Good product, good company.",
];

// ── 3-STAR REVIEW TEMPLATES ──

const THREESTAR_FULL = [
  "Decent but not my favorite {CATEGORY} strain. The {NAME} was ok but I expected more flavor.",
  "Its fine for the price. {NAME} gets the job done but nothing special about it.",
  "Ok product nothing special. I've had better {CATEGORY} resin from ResinPlug honestly.",
  "Expected more from the {NAME} based on the description. Not bad but not amazing either.",
  "The {NAME} was alright. Consistency could be better tho.",
  "Got the {NAME} and its decent. Not as flavorful as I hoped.",
  "Meh. The {NAME} is ok I guess. I prefer their other strains.",
  "3 stars because its middle of the road. The {NAME} is fine but doesnt stand out.",
  "Average product. The {NAME} didn't really do much for me compared to other options.",
  "Product was decent but the {FLAVOR1} flavor wasn't as strong as advertised.",
  "Not bad but consistency could be better on this {NAME}. A bit dry.",
  "The {NAME} is ok. I've tried better from other places at a similar price.",
  "Decent {CATEGORY} but I was expecting something more from the flavor profile.",
  "Its alright. The {NAME} is serviceable but nothing to write home about.",
  "Got this as part of a larger order. {NAME} was the weakest of the bunch for me.",
  "The {NAME} was underwhelming compared to the other strains I tried from here.",
  "Quality is acceptable but not exceptional. Expected more from the reviews.",
  "Flavor was muted and effects were mild. {NAME} might just not be my strain.",
  "The {NAME} is just ok. Not bad by any means but not great either.",
  "Decent enough product. Would maybe try again if they changed the pricing.",
  "Had higher expectations for {NAME}. Its passable but I've had much better.",
  "This batch of {NAME} was just so so. Maybe I got unlucky with the batch.",
  "The {NAME} is mediocre at best. Sorry but that's my honest take.",
  "Not terrible but not great. The {NAME} sits right in the middle for me.",
  "Ehh. The {NAME} was fine. Probably won't order this specific strain again tho.",
];

// ── TITLES ──

const TITLES_5STAR = [
  "Great product!",
  "Smooth hits",
  "Will order again",
  "Absolutely love it",
  "Best resin ever",
  "Incredible quality",
  "Game changer",
  "My new go-to",
  "Exceeded expectations",
  "Top shelf stuff",
  "Amazing flavor",
  "Highly recommend!",
  "Worth every penny",
  "Can't get enough",
  "Impressed",
  "Perfect in every way",
  "Outstanding",
  "Must try!",
  "So happy with this",
  "Premium quality",
  "Love this strain",
  "Best purchase I've made",
  "Absolutely fire",
  "Blown away",
  "No complaints",
  "A+ product",
  "Flawless",
  "The real deal",
  "Five star quality",
  "Perfection",
];

const TITLES_4STAR = [
  "Good stuff",
  "Solid choice",
  "Almost perfect",
  "Very good",
  "Would recommend",
  "Nice quality",
  "Pretty great",
  "Happy with it",
  "Good buy",
  "Quality product",
  "Not bad at all",
  "Quite nice",
  "Good value",
  "Decent pick",
  "Pleased overall",
];

const TITLES_3STAR = [
  "It's okay",
  "Decent",
  "Average product",
  "Not bad",
  "Could be better",
  "Just alright",
  "Meh",
  "So-so",
  "Room for improvement",
  "Nothing special",
];

// ── SPELLING MISTAKES INJECTION ──

const MISSPELLINGS: Record<string, string> = {
  "definitely": "definately",
  "received": "recieved",
  "their": "thier",
  "really": "realy",
  "it's": "its",
  "because": "becuz",
  "though": "tho",
  "through": "thru",
  "probably": "prolly",
  "before": "b4",
  "your": "ur",
  "great": "gr8",
  "favorite": "favourite",
  "amazing": "amazin",
  "recommend": "reccomend",
  "experience": "experiance",
  "consistent": "consistant",
  "beautiful": "beautful",
  "immediately": "immediatly",
  "beginning": "beggining",
  "different": "diffrent",
  "excellent": "excelent",
  "occurred": "occured",
  "separate": "seperate",
  "disappoint": "dissapoint",
};

function applyMisspellings(text: string): string {
  let result = text;
  // Pick 1-3 words to misspell
  const numMisspellings = randInt(1, 3);
  const keys = Object.keys(MISSPELLINGS);
  const selected = pickN(keys, numMisspellings);
  for (const word of selected) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    if (regex.test(result)) {
      result = result.replace(regex, MISSPELLINGS[word]);
    }
  }
  // Sometimes remove a period
  if (rand() < 0.3) {
    const lastDot = result.lastIndexOf(".");
    if (lastDot > 0 && lastDot < result.length - 1) {
      result = result.substring(0, lastDot) + result.substring(lastDot + 1);
    }
  }
  return result;
}

function addCasualSpeech(text: string): string {
  let result = text;
  // Randomly capitalize a word for emphasis
  if (rand() < 0.3) {
    const words = result.split(" ");
    if (words.length > 3) {
      const idx = randInt(1, words.length - 2);
      if (words[idx].length >= 3 && words[idx].length <= 8) {
        words[idx] = words[idx].toUpperCase();
        result = words.join(" ");
      }
    }
  }
  // Add extra exclamation marks
  if (rand() < 0.25) {
    result = result.replace(/!/, "!!!");
    if (!result.includes("!")) {
      result = result.replace(/\.$/, "!!");
    }
  }
  // Add "lol" or "tbh" or similar
  if (rand() < 0.15) {
    const additions = [" lol", " tbh", " ngl", " fr", " honestly"];
    result = result.replace(/\.$/, pick(additions) + ".");
  }
  return result;
}

/* ================================================================
   REVIEW GENERATOR
   ================================================================ */

function fillTemplate(template: string, product: ProductConfig): string {
  const f1 = pick(product.flavors);
  let f2 = pick(product.flavors);
  while (f2 === f1 && product.flavors.length > 1) {
    f2 = pick(product.flavors);
  }
  const effects = product.effects.split(", ");
  const e1 = pick(effects);
  let e2 = pick(effects);
  while (e2 === e1 && effects.length > 1) {
    e2 = pick(effects);
  }

  return template
    .replace(/\{NAME\}/g, product.name)
    .replace(/\{FLAVOR1\}/g, f1)
    .replace(/\{FLAVOR2\}/g, f2)
    .replace(/\{EFFECT1\}/g, e1.toLowerCase())
    .replace(/\{EFFECT2\}/g, e2.toLowerCase())
    .replace(/\{CATEGORY\}/g, product.category.toLowerCase());
}

type ContentCategory =
  | "flavor"
  | "effects"
  | "shipping"
  | "value"
  | "quality"
  | "repeat"
  | "general";

function pickCategory(): ContentCategory {
  const r = rand();
  if (r < 0.35) return "flavor";
  if (r < 0.50) return "effects";
  if (r < 0.60) return "shipping";
  if (r < 0.70) return "value";
  if (r < 0.80) return "quality";
  if (r < 0.85) return "repeat";
  return "general";
}

type LengthCategory = "mega_short" | "short" | "medium" | "long";

function pickLength(): LengthCategory {
  const r = rand();
  if (r < 0.10) return "mega_short";
  if (r < 0.65) return "short";
  if (r < 0.95) return "medium";
  return "long";
}

// Connectors and mini-phrases to make short reviews more unique
const SHORT_CONNECTORS = [
  "Seriously.", "For real.", "No joke.", "Trust me.", "Just try it.",
  "So impressed.", "Big fan.", "Love this.", "Great stuff.", "Top quality.",
  "Absolutely.", "100%.", "Without a doubt.", "Hands down.", "Period.",
  "No cap.", "Facts.", "On God.", "Best believe it.", "Say less.",
];

function generate5StarReview(product: ProductConfig): string {
  const length = pickLength();

  if (length === "mega_short") {
    const base = pick(MEGA_SHORT_5STAR);
    // Vary mega shorts more by sometimes appending product name or a connector
    const variant = rand();
    if (variant < 0.25) {
      return `${base}. ${product.name} is incredible.`;
    } else if (variant < 0.45) {
      return `${product.name} — ${base.toLowerCase().replace(/[.!]+$/, "")}!`;
    } else if (variant < 0.60) {
      return `${base} ${pick(SHORT_CONNECTORS)}`;
    }
    return base;
  }

  const category = pickCategory();

  let opener: string;
  let body: string;
  let closer: string;

  switch (category) {
    case "flavor":
      opener = fillTemplate(pick(FLAVOR_OPENERS), product);
      body = fillTemplate(pick(FLAVOR_BODIES), product);
      closer = pick(FLAVOR_CLOSERS);
      break;
    case "effects":
      opener = fillTemplate(pick(EFFECTS_OPENERS), product);
      body = fillTemplate(pick(EFFECTS_BODIES), product);
      closer = fillTemplate(pick(EFFECTS_CLOSERS), product);
      break;
    case "shipping":
      opener = fillTemplate(pick(SHIPPING_OPENERS), product);
      body = pick(SHIPPING_BODIES);
      closer = pick(SHIPPING_CLOSERS);
      break;
    case "value":
      opener = fillTemplate(pick(VALUE_OPENERS), product);
      body = pick(VALUE_BODIES);
      closer = pick(VALUE_CLOSERS);
      break;
    case "quality":
      opener = fillTemplate(pick(QUALITY_OPENERS), product);
      body = pick(QUALITY_BODIES);
      closer = pick(QUALITY_CLOSERS);
      break;
    case "repeat":
      opener = fillTemplate(pick(REPEAT_OPENERS), product);
      body = pick(REPEAT_BODIES);
      closer = pick(REPEAT_CLOSERS);
      break;
    default:
      opener = fillTemplate(pick(GENERAL_OPENERS), product);
      body = fillTemplate(pick(GENERAL_BODIES), product);
      closer = pick(GENERAL_CLOSERS);
      break;
  }

  switch (length) {
    case "short":
      // 1-2 sentences: opener + sometimes closer
      return rand() < 0.5 ? opener : `${opener} ${closer}`;
    case "medium":
      // 2-4 sentences: opener + body + closer
      return `${opener} ${body} ${closer}`;
    case "long": {
      // 5+ sentences: opener + multiple bodies + closer + extra
      const extraBody = fillTemplate(pick(GENERAL_BODIES), product);
      const extraBody2 = fillTemplate(
        pick(category === "flavor" ? FLAVOR_BODIES : GENERAL_BODIES),
        product
      );
      return `${opener} ${body} ${extraBody} ${extraBody2} ${closer}`;
    }
    default:
      return opener;
  }
}

function generate4StarReview(product: ProductConfig): string {
  const length = pickLength();

  if (length === "mega_short") {
    return pick(MEGA_SHORT_4STAR);
  }

  const opener = fillTemplate(pick(FOURSTAR_OPENERS), product);
  const issue = fillTemplate(pick(FOURSTAR_ISSUES), product);
  const closer = pick(FOURSTAR_CLOSERS);

  switch (length) {
    case "short":
      return `${opener} ${issue}`;
    case "medium":
      return `${opener} ${issue} ${closer}`;
    case "long": {
      const extraBody = fillTemplate(pick(GENERAL_BODIES), product);
      return `${opener} ${extraBody} ${issue} ${closer}`;
    }
    default:
      return `${opener} ${issue}`;
  }
}

function generate3StarReview(product: ProductConfig): string {
  return fillTemplate(pick(THREESTAR_FULL), product);
}

function generateTitle(rating: number): string | null {
  // ~40% get a title
  if (rand() > 0.40) return null;

  if (rating === 5) return pick(TITLES_5STAR);
  if (rating === 4) return pick(TITLES_4STAR);
  return pick(TITLES_3STAR);
}

function generateDate(): Date {
  // Random date within last 12 months from March 6, 2026
  const now = new Date(2026, 2, 6); // March 6, 2026
  const msInYear = 365 * 24 * 60 * 60 * 1000;
  const offset = Math.floor(rand() * msInYear);
  return new Date(now.getTime() - offset);
}

function generateHelpfulCount(): number {
  // ~70% get 0, ~30% get 1-20
  if (rand() > 0.30) return 0;
  return randInt(1, 20);
}

function generateRating(): number {
  const r = rand();
  if (r < 0.70) return 5;
  if (r < 0.95) return 4;
  return 3;
}

function generateReviewText(rating: number, product: ProductConfig): string {
  let text: string;

  if (rating === 5) {
    text = generate5StarReview(product);
  } else if (rating === 4) {
    text = generate4StarReview(product);
  } else {
    text = generate3StarReview(product);
  }

  // ~15% get spelling mistakes
  if (rand() < 0.15) {
    text = applyMisspellings(text);
  }

  // ~20% get casual speech modifications
  if (rand() < 0.20) {
    text = addCasualSpeech(text);
  }

  return text;
}

/* ================================================================
   SINGLE-PRODUCT GENERATOR (used by admin Review Generator tab)
   ================================================================ */

export function generateReviewsForSingleProduct(
  productId: string,
  productName: string,
  count: number,
): SeedReview[] {
  // Find product config
  const product = PRODUCTS.find((p) => p.name === productName);
  if (!product) {
    console.warn(`Product config not found for "${productName}", using generic config.`);
    // Fallback generic config
    const fallback: ProductConfig = {
      name: productName,
      category: "Hybrid",
      effects: "Relaxed, Happy, Euphoric",
      flavors: ["sweet", "earthy", "smooth", "herbal", "fruity"],
    };
    return generateForConfig(productId, fallback, count);
  }
  return generateForConfig(productId, product, count);
}

function generateForConfig(
  productId: string,
  product: ProductConfig,
  count: number,
): SeedReview[] {
  // Use current time as seed so each batch is unique
  rng = mulberry32(Date.now());

  const reviews: SeedReview[] = [];
  const usedTexts = new Set<string>();
  const names = generateNames(count);

  for (let i = 0; i < count; i++) {
    const rating = generateRating();

    let text = generateReviewText(rating, product);
    let attempts = 0;
    while (usedTexts.has(text) && attempts < 10) {
      text = generateReviewText(rating, product);
      attempts++;
    }
    if (usedTexts.has(text)) {
      const suffixes = [
        " Would order again.", " Very happy.", " Great experience overall.",
        " No regrets.", " Solid purchase.", " Really enjoying it.",
        " Glad I found this.", " Top marks from me.", " Pleasantly surprised.",
        " Quality is there.",
      ];
      text = text + " " + suffixes[i % suffixes.length];
    }
    usedTexts.add(text);

    const title = generateTitle(rating);
    const helpfulCount = generateHelpfulCount();
    const createdAt = generateDate();

    reviews.push({
      productId,
      customerName: names[i],
      rating,
      title,
      text,
      verified: true,
      helpfulCount,
      createdAt,
    });
  }

  return reviews;
}

/** Exported product config list for the admin UI product selector */
export const PRODUCT_CONFIGS = PRODUCTS;

/* ================================================================
   BULK EXPORT (used by seed.ts)
   ================================================================ */

export function generateAllReviews(
  productMap: Map<string, string>
): SeedReview[] {
  // Reset RNG for determinism
  rng = mulberry32(SEED);

  const allReviews: SeedReview[] = [];
  const usedTexts = new Set<string>();

  for (const product of PRODUCTS) {
    const productId = productMap.get(product.name);
    if (!productId) {
      console.warn(`Product "${product.name}" not found in productMap, skipping.`);
      continue;
    }

    // 50-100 reviews per product
    const reviewCount = randInt(50, 100);
    const names = generateNames(reviewCount);

    for (let i = 0; i < reviewCount; i++) {
      const rating = generateRating();

      // Ensure global text uniqueness with retry
      let text = generateReviewText(rating, product);
      let attempts = 0;
      while (usedTexts.has(text) && attempts < 10) {
        text = generateReviewText(rating, product);
        attempts++;
      }
      // If still duplicate after retries, append a small unique suffix
      if (usedTexts.has(text)) {
        const suffixes = [
          " Would order again.",
          " Very happy.",
          " Great experience overall.",
          " No regrets.",
          " Solid purchase.",
          " Really enjoying it.",
          " Glad I found this.",
          " Top marks from me.",
          " Pleasantly surprised.",
          " Quality is there.",
        ];
        text = text + " " + suffixes[allReviews.length % suffixes.length];
      }
      usedTexts.add(text);

      const title = generateTitle(rating);
      const helpfulCount = generateHelpfulCount();
      const createdAt = generateDate();

      allReviews.push({
        productId,
        customerName: names[i],
        rating,
        title,
        text,
        verified: true,
        helpfulCount,
        createdAt,
      });
    }
  }

  return allReviews;
}

/* ================================================================
   CLI RUNNER — seeds the database directly
   ================================================================ */

async function main() {
  console.log("Generating reviews for all 34 products...\n");

  // Fetch products from database
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true },
  });

  if (products.length === 0) {
    console.error(
      "No products found in database. Run the main seed first: npm run db:seed"
    );
    process.exit(1);
  }

  console.log(`Found ${products.length} products in database.`);

  // Build name -> id map
  const productMap = new Map<string, string>();
  for (const p of products) {
    productMap.set(p.name, p.id);
  }

  // Generate all reviews
  const reviews = generateAllReviews(productMap);

  console.log(`Generated ${reviews.length} total reviews.`);

  // Print distribution stats
  const statsByRating = new Map<number, number>();
  const statsByProduct = new Map<string, number>();
  for (const r of reviews) {
    statsByRating.set(r.rating, (statsByRating.get(r.rating) || 0) + 1);
    const pName =
      PRODUCTS.find(
        (p) => productMap.get(p.name) === r.productId
      )?.name || "Unknown";
    statsByProduct.set(pName, (statsByProduct.get(pName) || 0) + 1);
  }

  console.log("\nRating distribution:");
  for (const [rating, count] of [...statsByRating.entries()].sort()) {
    const pct = ((count / reviews.length) * 100).toFixed(1);
    console.log(`  ${rating}-star: ${count} (${pct}%)`);
  }

  console.log("\nReviews per product:");
  for (const [name, count] of [...statsByProduct.entries()].sort()) {
    console.log(`  ${name}: ${count}`);
  }

  // Clear existing reviews and bulk insert
  console.log("\nClearing existing reviews...");
  await prisma.review.deleteMany();

  console.log("Inserting reviews...");
  // Prisma createMany has a limit, batch by 500
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE).map((r) => ({
      productId: r.productId,
      customerName: r.customerName,
      rating: r.rating,
      title: r.title,
      text: r.text,
      verified: r.verified,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt,
    }));
    const result = await prisma.review.createMany({ data: batch });
    inserted += result.count;
    console.log(
      `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.count} reviews inserted (${inserted} total)`
    );
  }

  console.log(`\nSuccessfully seeded ${inserted} reviews!`);
}

// Only run standalone when executed directly (not when imported by seed.ts)
if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("Review seed failed:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

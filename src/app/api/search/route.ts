import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, badRequest, serverError } from "@/lib/api-response";
import { formatProduct } from "@/lib/serialize";

/**
 * Server-side product search with multi-signal scoring.
 * Mirrors the client-side algorithm from the frontend's src/lib/search.ts.
 */
function scoreProduct(
  product: { name: string; category: string; popularity: number },
  query: string
): number {
  const q = query.toLowerCase().trim();
  const name = product.name.toLowerCase();

  if (!q) return 0;

  let score = 0;

  // Exact match
  if (name === q) {
    score = 100;
  }
  // Starts with query
  else if (name.startsWith(q)) {
    score = 80;
  }
  // Any word starts with query
  else if (name.split(/\s+/).some((w) => w.startsWith(q))) {
    score = 70;
  }
  // Contains query
  else if (name.includes(q)) {
    score = 50;
  }
  // Category match
  else if (product.category.toLowerCase().includes(q)) {
    score = 40;
  }
  // Fuzzy match (Levenshtein distance)
  else {
    const distance = levenshtein(q, name.slice(0, q.length + 2));
    if (distance <= 2) {
      score = 20;
    }
  }

  // Popularity bonus (0-10 points)
  if (score > 0) {
    score += product.popularity;
  }

  return score;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;

    if (!q || q.length === 0) {
      return badRequest("Query parameter 'q' is required");
    }

    // Fetch all active products (34 products is small enough to score in-memory)
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });

    const scored = products
      .map((p) => ({
        product: p,
        score: scoreProduct(p, q),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return success(
      scored.map((s) => ({
        ...formatProduct(s.product as unknown as Record<string, unknown>),
        _score: s.score,
      }))
    );
  } catch (err) {
    console.error("GET /api/search error:", err);
    return serverError();
  }
}

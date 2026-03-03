/**
 * Rewards / Tier calculation helpers.
 *
 * Tiers are based on **lifetime earned** credits (sum of all "earned" type
 * credits), NOT the current spendable balance. This means spending credits
 * on store credit never demotes a user.
 *
 * 1 point = 1 credit = $1 spent on an order (floor).
 */

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export const TIER_THRESHOLDS: Record<
  Tier,
  { min: number; max: number; next: Tier }
> = {
  Bronze: { min: 0, max: 500, next: "Silver" },
  Silver: { min: 500, max: 1000, next: "Gold" },
  Gold: { min: 1000, max: 2000, next: "Platinum" },
  Platinum: { min: 2000, max: 2000, next: "Platinum" },
};

export function calculateTier(lifetimeEarnings: number): Tier {
  if (lifetimeEarnings >= 2000) return "Platinum";
  if (lifetimeEarnings >= 1000) return "Gold";
  if (lifetimeEarnings >= 500) return "Silver";
  return "Bronze";
}

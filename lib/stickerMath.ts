/**
 * Sticker decay math — pure functions, safe to import in both
 * Server Actions and Client Components.
 *
 * Kept in lib/ (not app/actions/) so it carries no 'use server' constraint.
 */

/**
 * Calculates the current CSS opacity of a sticker based on how much time
 * has passed since its last Re-Up.
 *
 * Formula: 1.0 - (daysSinceReup × decayRatePerDay)
 * Floor:   hard 0.20 — the "ghost sticker" threshold.
 */
export function calcStickerOpacity(
  lastReupAt: string,
  decayRatePerDay: number
): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = (Date.now() - new Date(lastReupAt).getTime()) / msPerDay;
  const raw = 1.0 - daysSince * decayRatePerDay;
  return Math.max(raw, 0.2); // 20% floor — "ghost sticker"
}

/**
 * Returns the discounted Re-Up cost.
 *
 * Discount is proportional to how much opacity has been lost:
 *   e.g. sticker at 50% opacity (50% gone) → 50% discount → 50% of originalCost.
 * Always costs at least 1 point.
 */
export function calcReupCost(
  originalCost: number,
  currentOpacity: number
): number {
  const decayFraction = 1.0 - currentOpacity; // 0 (full) → 0.8 (ghost floor)
  const discountedCost = Math.ceil(originalCost * (1 - decayFraction));
  return Math.max(discountedCost, 1);
}

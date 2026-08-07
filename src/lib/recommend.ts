import { itemsOf, seedForCombo } from "./data";
import { isNeutral } from "./colors";
import { scoreOutfit } from "./scoring";
import type {
  Category,
  ItemStatus,
  OutfitCombo,
  RecommendationContext,
  RecommendationResult,
  ScoredOutfit,
  UserState,
  WardrobeItem,
} from "./types";

export function effectiveStatus(item: WardrobeItem, user: UserState): ItemStatus {
  return user.statusOverrides[item.id] ?? item.status;
}

export function availableItems(category: Category, user: UserState): WardrobeItem[] {
  return itemsOf(category).filter((i) => effectiveStatus(i, user) === "active");
}

/** Every wearable top × bottom × shoe combination, scored and sorted. */
export function allCandidates(
  ctx: RecommendationContext,
  user: UserState,
  now: Date = new Date(),
): ScoredOutfit[] {
  const tops = availableItems("top", user);
  const bottoms = availableItems("bottom", user);
  const shoes = availableItems("shoe", user);
  const out: ScoredOutfit[] = [];
  for (const t of tops)
    for (const b of bottoms)
      for (const s of shoes) {
        out.push(scoreOutfit({ top: t.id, bottom: b.id, shoe: s.id }, ctx, user, now));
      }
  return out.sort((a, b) => b.breakdown.total - a.breakdown.total);
}

function sharedItems(a: OutfitCombo, b: OutfitCombo): number {
  let n = 0;
  if (a.top === b.top) n++;
  if (a.bottom === b.bottom) n++;
  if (a.shoe === b.shoe) n++;
  return n;
}

function isSafeCandidate(o: ScoredOutfit, user: UserState): boolean {
  if (user.decisions[o.key]?.verdict === "approved") return true;
  if (seedForCombo(o.combo)?.status === "approved") return true;
  // Otherwise: strong colour harmony + sane silhouette counts as safe.
  return o.breakdown.color >= 8.6 && o.breakdown.silhouette >= 7.5;
}

export interface RecommendationSet {
  results: RecommendationResult[];
  /** Set when a genuinely strong third look doesn't exist. */
  hint: string | null;
}

/**
 * Pick up to three roles — Best / Safe / Different — favouring visual
 * diversity over raw score ranking. Never invents a weak filler outfit.
 */
export function recommend(
  ctx: RecommendationContext,
  user: UserState,
  now: Date = new Date(),
): RecommendationSet {
  const candidates = allCandidates(ctx, user, now).filter(
    (c) => user.decisions[c.key]?.verdict !== "rejected",
  );
  const results: RecommendationResult[] = [];
  if (candidates.length === 0) return { results, hint: buildHint(user) };

  const best = candidates[0];
  results.push({ role: "best", outfit: best });

  const safe = candidates.find(
    (c) => c.key !== best.key && sharedItems(c.combo, best.combo) <= 2 && isSafeCandidate(c, user),
  );
  if (safe) results.push({ role: "safe", outfit: safe });

  const taken = results.map((r) => r.outfit);
  const different = candidates.find((c) => {
    if (taken.some((t) => t.key === c.key)) return false;
    if (taken.some((t) => sharedItems(c.combo, t.combo) >= 2)) return false;
    // Ask for a genuinely different face: the top garment must change.
    if (taken.some((t) => t.combo.top === c.combo.top)) return false;
    return c.breakdown.total >= 6.6;
  });
  if (different) results.push({ role: "different", outfit: different });

  return { results, hint: results.length < 3 ? buildHint(user) : null };
}

/** A useful nudge instead of a weak filler recommendation. */
function buildHint(user: UserState): string {
  const shoes = availableItems("shoe", user);
  const realShoes = shoes.filter((s) => !s.placeholder);
  if (shoes.length === 0)
    return "No shoes available right now. Recommendations are based on the rest of your wardrobe.";
  if (realShoes.length === 0)
    return "Your shoes are placeholders for now — adding a real neutral sneaker would unlock more looks.";
  const neutralShoe = shoes.some((s) => isNeutral(s.color.family));
  if (!neutralShoe) return "Adding a neutral sneaker would unlock more looks.";
  return "A third distinct look isn't strong enough today — a mid-tone bottom would open up more combinations.";
}

/**
 * Alternatives for one slot of an existing outfit, each with the
 * recomputed total the outfit would have after the swap.
 */
export function swapAlternatives(
  combo: OutfitCombo,
  slot: Category,
  ctx: RecommendationContext,
  user: UserState,
  now: Date = new Date(),
): ScoredOutfit[] {
  const current = slot === "top" ? combo.top : slot === "bottom" ? combo.bottom : combo.shoe;
  return availableItems(slot, user)
    .filter((i) => i.id !== current)
    .map((i) =>
      scoreOutfit(
        {
          top: slot === "top" ? i.id : combo.top,
          bottom: slot === "bottom" ? i.id : combo.bottom,
          shoe: slot === "shoe" ? i.id : combo.shoe,
        },
        ctx,
        user,
        now,
      ),
    )
    .sort((a, b) => b.breakdown.total - a.breakdown.total);
}

/** Top-scoring combinations that contain a given item (for item detail). */
export function combosContaining(
  itemId: string,
  ctx: RecommendationContext,
  user: UserState,
  limit = 4,
): ScoredOutfit[] {
  return allCandidates(ctx, user)
    .filter(
      (c) => c.combo.top === itemId || c.combo.bottom === itemId || c.combo.shoe === itemId,
    )
    .slice(0, limit);
}

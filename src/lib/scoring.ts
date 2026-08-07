import { comboItems, comboKey, seedForCombo } from "./data";
import { isNeutral, pairLabel, pairScore } from "./colors";
import type {
  Fit,
  Occasion,
  OutfitCombo,
  RecommendationContext,
  ScoreBreakdown,
  ScoredOutfit,
  UserState,
  WardrobeItem,
} from "./types";

/**
 * Deterministic outfit scoring — no external AI, no randomness.
 * Conceptual weighting from the product brief; tune here, nowhere else.
 */
export const WEIGHTS = {
  occasion: 0.3,
  taste: 0.3,
  color: 0.2,
  silhouette: 0.1,
  practicality: 0.1,
} as const;

const clamp10 = (n: number) => Math.min(10, Math.max(0, n));

/* ------------------------------------------------------------------ */
/* Occasion fit                                                        */
/* ------------------------------------------------------------------ */

/** Occasions that borrow well from each other. */
const OCCASION_NEIGHBORS: Record<Occasion, Occasion[]> = {
  factory: ["casual"],
  "customer-visit": ["dinner"],
  shopping: ["casual", "travel"],
  casual: ["shopping", "travel"],
  dinner: ["customer-visit", "night-out"],
  "night-out": ["dinner", "shopping"],
  travel: ["casual", "shopping"],
};

function occasionFit(items: WardrobeItem[], ctx: RecommendationContext): number {
  const { occasion } = ctx;
  if (!occasion) return 7.5;
  let sum = 0;
  for (const item of items) {
    let s: number;
    if (item.occasions.includes(occasion)) s = 10;
    else if (OCCASION_NEIGHBORS[occasion].some((o) => item.occasions.includes(o))) s = 6.5;
    else s = 3.5;
    // A customer visit rewards pieces that read clean/smart even beyond tags.
    if (
      (occasion === "customer-visit" || ctx.refine.workContext === "customer-visit") &&
      (item.styles.includes("clean") || item.styles.includes("smart"))
    ) {
      s = Math.min(10, s + 0.8);
    }
    if (ctx.refine.style && item.styles.includes(ctx.refine.style)) {
      s = Math.min(10, s + 0.6);
    }
    sum += s;
  }
  return clamp10(sum / items.length);
}

/* ------------------------------------------------------------------ */
/* Personal taste — learned from approvals, rejections, favourites      */
/* ------------------------------------------------------------------ */

function pairIds(combo: OutfitCombo): string[] {
  return [
    `${combo.top}|${combo.bottom}`,
    `${combo.top}|${combo.shoe}`,
    `${combo.bottom}|${combo.shoe}`,
  ];
}

function tasteScore(combo: OutfitCombo, items: WardrobeItem[], user: UserState): number {
  const key = comboKey(combo);
  const decision = user.decisions[key];
  if (decision?.verdict === "rejected") return 1.5;

  let score = 6.5;
  if (decision?.verdict === "approved") score = 9.5;
  else if (seedForCombo(combo)?.status === "approved") score = 8.5;

  // Pair-level affinity learned from every past decision.
  const affinity = new Map<string, number>();
  for (const [dKey, d] of Object.entries(user.decisions)) {
    const parts = dKey.split("_");
    if (parts.length !== 3) continue;
    const delta = d.verdict === "approved" ? 0.5 : -0.5;
    const dCombo = { top: parts[0], bottom: parts[1], shoe: parts[2] };
    for (const p of pairIds(dCombo)) affinity.set(p, (affinity.get(p) ?? 0) + delta);
  }
  for (const p of pairIds(combo)) {
    score += Math.max(-1, Math.min(1, affinity.get(p) ?? 0));
  }

  if (user.favoriteLooks.includes(key)) score += 0.8;
  score += items.filter((i) => user.favoritePieces.includes(i.id)).length * 0.25;

  // Reason-aware nudges: recurring rejection themes shade similar outfits.
  const reasons = Object.values(user.decisions)
    .filter((d) => d.verdict === "rejected" && d.reason)
    .map((d) => d.reason!);
  const count = (r: string) => reasons.filter((x) => x === r).length;
  const greyPieces = items.filter((i) => ["grey", "charcoal"].includes(i.color.family)).length;
  if (greyPieces >= 2) score -= Math.min(1, count("too much grey") * 0.4);
  const widePieces = items.filter(
    (i) => i.fit === "oversized" || i.fit === "loose" || i.fit === "wide",
  ).length;
  if (widePieces >= 2) score -= Math.min(1, count("too wide") * 0.4);

  return clamp10(score);
}

/* ------------------------------------------------------------------ */
/* Colour harmony                                                      */
/* ------------------------------------------------------------------ */

function colorScore(items: WardrobeItem[]): number {
  const [top, bottom, shoe] = items;
  return clamp10(
    pairScore(top.color.family, bottom.color.family) * 0.55 +
      pairScore(bottom.color.family, shoe.color.family) * 0.25 +
      pairScore(top.color.family, shoe.color.family) * 0.2,
  );
}

/* ------------------------------------------------------------------ */
/* Silhouette balance                                                  */
/* ------------------------------------------------------------------ */

const FIT_VOLUME: Record<Fit, number> = { slim: 1, regular: 2, loose: 3, wide: 4, oversized: 4 };

function volume(item: WardrobeItem): number {
  return item.fit ? FIT_VOLUME[item.fit] : 2;
}

function shoeVolume(shoe: WardrobeItem): number {
  return shoe.type === "runner" || shoe.type === "boot" ? 3 : 2;
}

function silhouetteScore(items: WardrobeItem[], combo: OutfitCombo, user: UserState): number {
  const [top, bottom, shoe] = items;
  const tv = volume(top);
  const bv = volume(bottom);
  const sv = shoeVolume(shoe);

  let score = 8;
  const spread = Math.abs(tv - bv);
  if (spread === 1) score += 1; // one anchored, one relaxed — the sweet spot
  if (spread >= 3) score -= 1.5; // extreme contrast reads accidental

  // Volume everywhere: oversized top + very wide bottom + bulky shoe.
  if (tv >= 3 && bv >= 3 && sv >= 3) score -= 3.5;
  else if (tv >= 4 && bv >= 4) score -= 2;

  // A specifically approved combination overrides the volume caution.
  const decision = user.decisions[comboKey(combo)];
  if (decision?.verdict === "approved") score = Math.max(score, 8);

  return clamp10(score);
}

/* ------------------------------------------------------------------ */
/* Practicality — occasion, work context and weather aware              */
/* ------------------------------------------------------------------ */

function practicalityScore(items: WardrobeItem[], ctx: RecommendationContext): number {
  const { occasion, refine } = ctx;
  const factoryFloor =
    refine.workContext === "factory-floor" || (occasion === "factory" && refine.workContext !== "office");
  const weather = refine.weather;

  let sum = 0;
  for (const item of items) {
    let s = item.practicality;
    // Normalize type spelling ("long_sleeve_tee" → "long-sleeve-tee").
    const type = item.type.replace(/_/g, "-");
    const longSleeved = type.includes("long-sleeve") || type === "shirt";
    if (factoryFloor) {
      // Dirt and oil risk matters more; light colours take a penalty (never a ban).
      if (item.color.tone === "light") s -= 2.5;
      if (item.practicality <= 4) s -= 1;
    }
    if (refine.workContext === "office" && occasion === "factory") {
      s = Math.max(s, 6); // relaxed rules away from the machines
    }
    if (weather === "hot" || weather === "humid") {
      if (type.includes("shorts") || type === "tee") s += 1.2;
      if (longSleeved) s -= 1;
      if (!item.weather.includes(weather)) s -= 1.2;
    }
    if (weather === "rainy") {
      if (item.category === "shoe" && item.color.tone === "light") s -= 2.5;
      if (item.material?.toLowerCase().includes("suede")) s -= 1.5;
      if (!item.weather.includes("rainy")) s -= 1;
    }
    if (weather === "indoor_ac") {
      if (longSleeved) s += 1.2;
      if (type.includes("shorts")) s -= 0.8;
    }
    sum += clamp10(s);
  }
  return clamp10(sum / items.length);
}

/* ------------------------------------------------------------------ */
/* Recency — dynamic penalty, never a hard block                        */
/* ------------------------------------------------------------------ */

function recencyPenalty(combo: OutfitCombo, user: UserState, now: Date): number {
  const key = comboKey(combo);
  const ids = new Set([combo.top, combo.bottom, combo.shoe]);
  let penalty = 0;
  for (const entry of user.wearLog) {
    const days = Math.max(0, (now.getTime() - new Date(entry.date).getTime()) / 86_400_000);
    if (entry.key === key) {
      penalty += 2.2 * Math.exp(-days / 5);
    } else {
      const shared = entry.items.filter((id) => ids.has(id)).length;
      penalty += shared * 0.2 * Math.exp(-days / 3);
    }
  }
  return Math.min(3, penalty);
}

/* ------------------------------------------------------------------ */
/* Reasons ("why it works")                                            */
/* ------------------------------------------------------------------ */

function buildReasons(
  items: WardrobeItem[],
  b: Omit<ScoreBreakdown, "total" | "recencyPenalty">,
  ctx: RecommendationContext,
): string[] {
  const [top, bottom] = items;
  const reasons: string[] = [];

  const tb = pairScore(top.color.family, bottom.color.family);
  if (tb >= 9) reasons.push(`${pairLabel(top.color.family, bottom.color.family)} is a proven pairing`);
  else if (tb >= 7.8) reasons.push(`${pairLabel(top.color.family, bottom.color.family)} — slightly forward, still wearable`);

  if (b.silhouette >= 8.5) reasons.push("balanced silhouette");
  if (items.every((i) => isNeutral(i.color.family))) reasons.push("all-neutral palette, hard to get wrong");

  const factoryish = ctx.occasion === "factory" || ctx.refine.workContext === "factory-floor";
  if (factoryish && b.practicality >= 7) reasons.push("factory-safe — dark, durable pieces");
  if (ctx.refine.weather === "hot" && b.practicality >= 7) reasons.push("breathes in the heat");
  if (ctx.refine.weather === "rainy" && b.practicality >= 7) reasons.push("holds up in rain");
  if (ctx.occasion === "customer-visit" && b.occasion >= 8.5) reasons.push("clean, presentable impression");
  if (b.taste >= 9) reasons.push("you've approved this combination before");
  else if (b.taste >= 8) reasons.push("close to combinations you like");

  if (reasons.length === 0) reasons.push("a quiet, dependable combination");
  return reasons.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function scoreOutfit(
  combo: OutfitCombo,
  ctx: RecommendationContext,
  user: UserState,
  now: Date = new Date(),
): ScoredOutfit {
  const items = comboItems(combo);
  const partial = {
    occasion: occasionFit(items, ctx),
    taste: tasteScore(combo, items, user),
    color: colorScore(items),
    silhouette: silhouetteScore(items, combo, user),
    practicality: practicalityScore(items, ctx),
  };
  const weighted =
    partial.occasion * WEIGHTS.occasion +
    partial.taste * WEIGHTS.taste +
    partial.color * WEIGHTS.color +
    partial.silhouette * WEIGHTS.silhouette +
    partial.practicality * WEIGHTS.practicality;
  const penalty = recencyPenalty(combo, user, now);
  const breakdown: ScoreBreakdown = {
    ...partial,
    recencyPenalty: penalty,
    total: clamp10(weighted - penalty),
  };
  return {
    key: comboKey(combo),
    combo,
    breakdown,
    reasons: buildReasons(items, partial, ctx),
    seed: seedForCombo(combo),
  };
}

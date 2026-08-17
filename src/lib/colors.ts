import type { ColorFamily } from "./types";

/**
 * Deterministic colour-harmony model.
 *
 * Scores are 0–10 for a pair of colour families. Philosophy:
 * mostly safe and wearable, occasionally slightly fashion-forward,
 * never random experimentation for novelty's sake.
 */

const NEUTRALS: ColorFamily[] = ["black", "charcoal", "grey", "white", "beige"];

function pairId(a: ColorFamily, b: ColorFamily): string {
  return [a, b].sort().join("|");
}

/** Explicitly rated pairs. Anything unlisted falls back to neutral/default rules. */
const PAIR_SCORES: Record<string, number> = {
  // Safe, endorsed combinations
  [pairId("charcoal", "black")]: 9.5,
  [pairId("baby-blue", "black")]: 9.5,
  [pairId("beige", "black")]: 9.5,
  [pairId("white", "grey")]: 9.5,
  [pairId("greenish-blue", "black")]: 9.5,
  // Slightly adventurous but acceptable
  [pairId("charcoal", "apricot")]: 8.2,
  [pairId("baby-blue", "grey")]: 8.4,
  // Other sensible readings of the wardrobe
  [pairId("charcoal", "grey")]: 8.6,
  [pairId("charcoal", "white")]: 8.8,
  [pairId("black", "white")]: 9.0,
  [pairId("black", "grey")]: 9.0,
  [pairId("beige", "white")]: 8.2,
  [pairId("beige", "grey")]: 8.0,
  [pairId("greenish-blue", "grey")]: 8.2,
  [pairId("greenish-blue", "white")]: 7.8,
  [pairId("baby-blue", "white")]: 8.6,
  [pairId("baby-blue", "beige")]: 7.6,
  [pairId("apricot", "white")]: 7.4,
  [pairId("apricot", "black")]: 7.8,
  [pairId("apricot", "beige")]: 6.0,
  [pairId("apricot", "grey")]: 6.8,
  // Risky — same-colour flooding or muddy pairings
  [pairId("charcoal", "beige")]: 7.6,
  [pairId("charcoal", "greenish-blue")]: 7.8,
  [pairId("charcoal", "charcoal")]: 7.0,
  [pairId("black", "black")]: 8.4,
  [pairId("grey", "grey")]: 5.8,
  [pairId("white", "white")]: 6.4,
  [pairId("beige", "beige")]: 5.5,
  [pairId("apricot", "apricot")]: 4.0,
  [pairId("greenish-blue", "apricot")]: 5.0,
  [pairId("greenish-blue", "baby-blue")]: 5.5,
  [pairId("greenish-blue", "beige")]: 7.2,
  [pairId("baby-blue", "apricot")]: 5.2,
  [pairId("baby-blue", "charcoal")]: 8.4,
  [pairId("white", "baby-blue")]: 8.6,
  // Brown (checked suit trousers) — earthy, pairs best with clean neutrals
  [pairId("brown", "white")]: 8.8,
  [pairId("brown", "black")]: 8.4,
  [pairId("brown", "beige")]: 8.0,
  [pairId("brown", "baby-blue")]: 8.2,
  [pairId("brown", "charcoal")]: 7.6,
  [pairId("brown", "grey")]: 7.2,
  [pairId("brown", "greenish-blue")]: 6.6,
  [pairId("brown", "apricot")]: 5.8,
  [pairId("brown", "brown")]: 5.5,
  // Purple (dusty mauve tee) — a colour piece that behaves best anchored by a
  // neutral bottom. Other colours are allowed but deliberately unrewarded.
  [pairId("purple", "black")]: 9.4,
  [pairId("purple", "charcoal")]: 9.2,
  [pairId("purple", "white")]: 9.0,
  [pairId("purple", "grey")]: 8.8,
  [pairId("purple", "beige")]: 7.6,
  [pairId("purple", "brown")]: 7.0,
  [pairId("purple", "baby-blue")]: 6.8,
  [pairId("purple", "greenish-blue")]: 6.2,
  [pairId("purple", "apricot")]: 5.4,
  [pairId("purple", "purple")]: 5.5,
  // Pink (pale) — same logic; light pink needs a darker or cleaner anchor,
  // and pale-on-pale washes out.
  [pairId("pink", "black")]: 9.4,
  [pairId("pink", "charcoal")]: 9.2,
  [pairId("pink", "grey")]: 9.0,
  [pairId("pink", "white")]: 8.6,
  [pairId("pink", "beige")]: 7.4,
  [pairId("pink", "brown")]: 7.2,
  [pairId("pink", "baby-blue")]: 6.6,
  [pairId("pink", "greenish-blue")]: 6.0,
  [pairId("pink", "apricot")]: 5.4,
  [pairId("pink", "pink")]: 5.0,
  // Two statement colours together — tonally related, still a deliberate look.
  [pairId("purple", "pink")]: 6.2,
};

export function pairScore(a: ColorFamily, b: ColorFamily): number {
  const explicit = PAIR_SCORES[pairId(a, b)];
  if (explicit !== undefined) return explicit;
  if (a === b) return 6.0;
  if (NEUTRALS.includes(a) && NEUTRALS.includes(b)) return 8.0;
  if (NEUTRALS.includes(a) || NEUTRALS.includes(b)) return 7.0;
  return 5.0;
}

export function isNeutral(family: ColorFamily): boolean {
  return NEUTRALS.includes(family);
}

/** Human-readable label for a pairing, used in "why it works" copy. */
export function pairLabel(a: ColorFamily, b: ColorFamily): string {
  const nice: Record<ColorFamily, string> = {
    black: "black",
    charcoal: "charcoal",
    grey: "grey",
    white: "white",
    beige: "beige",
    "baby-blue": "baby blue",
    "greenish-blue": "greenish blue",
    apricot: "apricot",
    brown: "brown",
    purple: "purple",
    pink: "pink",
  };
  return `${nice[a]} + ${nice[b]}`;
}

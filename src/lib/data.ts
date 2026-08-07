import wardrobeJson from "@/data/wardrobe.json";
import outfitsJson from "@/data/outfits.json";
import type { Category, OutfitCombo, OutfitSeed, WardrobeItem } from "./types";

/** Canonical seed data. Never mutated at runtime — user changes live in localStorage. */
export const wardrobe = (wardrobeJson as { items: WardrobeItem[] }).items;

export const outfitSeeds = (outfitsJson as { outfits: OutfitSeed[] }).outfits;

const byId = new Map(wardrobe.map((item) => [item.id, item]));

export function getItem(id: string): WardrobeItem | undefined {
  return byId.get(id);
}

export function itemsOf(category: Category): WardrobeItem[] {
  return wardrobe.filter((i) => i.category === category);
}

/** Stable identity for any top/bottom/shoe combination. */
export function comboKey(combo: OutfitCombo): string {
  return `${combo.top}_${combo.bottom}_${combo.shoe}`;
}

export function parseComboKey(key: string): OutfitCombo | null {
  const parts = key.split("_");
  if (parts.length !== 3) return null;
  const [top, bottom, shoe] = parts;
  if (!byId.has(top) || !byId.has(bottom) || !byId.has(shoe)) return null;
  return { top, bottom, shoe };
}

const seedByKey = new Map(outfitSeeds.map((s) => [comboKey(s.items), s]));
const seedById = new Map(outfitSeeds.map((s) => [s.id, s]));

export function seedForCombo(combo: OutfitCombo): OutfitSeed | undefined {
  return seedByKey.get(comboKey(combo));
}

export function seedByOutfitId(id: string): OutfitSeed | undefined {
  return seedById.get(id);
}

/** Resolve a route param that may be a curated outfit id or a raw combo key. */
export function resolveOutfitParam(param: string): { combo: OutfitCombo; seed?: OutfitSeed } | null {
  const seed = seedById.get(param);
  if (seed) return { combo: seed.items, seed };
  const combo = parseComboKey(param);
  if (combo) return { combo, seed: seedByKey.get(param) };
  return null;
}

export function comboItems(combo: OutfitCombo): [WardrobeItem, WardrobeItem, WardrobeItem] {
  return [byId.get(combo.top)!, byId.get(combo.bottom)!, byId.get(combo.shoe)!];
}

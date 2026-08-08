import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { wardrobe } from "@/lib/data";
import { allCandidates } from "@/lib/recommend";
import type { UserState } from "@/lib/types";

const EMPTY_USER: UserState = {
  favoriteLooks: [],
  favoritePieces: [],
  decisions: {},
  wearLog: [],
  statusOverrides: {},
};

const NEUTRAL_CTX = {
  occasion: null,
  refine: { weather: null, style: null, workContext: null },
} as const;

describe("wardrobe inventory", () => {
  it("has exactly 18 items", () => {
    expect(wardrobe).toHaveLength(18);
  });

  it("has 7 tops / 8 bottoms / 2 shoes / 1 sock", () => {
    const count = (c: string) => wardrobe.filter((i) => i.category === c).length;
    expect(count("top")).toBe(7);
    expect(count("bottom")).toBe(8);
    expect(count("shoe")).toBe(2);
    expect(count("sock")).toBe(1);
  });

  it("has unique ids and slugs", () => {
    expect(new Set(wardrobe.map((i) => i.id)).size).toBe(wardrobe.length);
    expect(new Set(wardrobe.map((i) => i.slug)).size).toBe(wardrobe.length);
  });

  it("contains exactly one New Balance 530 with the replaced image", () => {
    const nb530 = wardrobe.filter((i) => i.name === "New Balance 530");
    expect(nb530).toHaveLength(1);
    expect(nb530[0].id).toBe("shoe-001");
    expect(nb530[0].slug).toBe("new-balance-530-silver-metallic-summer-fog-nb-navy");
    expect(nb530[0].images.map((img) => img.src)).toEqual([
      "/assets/shoes/new-balance-530-silver-metallic.webp",
    ]);
  });

  it("HIMLAND Shorts uses its real hero image, and the file exists", () => {
    const himland = wardrobe.find((i) => i.id === "bottom-004");
    expect(himland?.name).toBe("HIMLAND Shorts");
    const hero = himland?.images.find((img) => img.type === "hero");
    expect(hero?.src).toBe("/assets/bottoms/himland-shorts-black.webp");
    expect(existsSync(join(__dirname, "..", "public", hero!.src))).toBe(true);
  });

  it("every referenced image asset exists on disk", () => {
    for (const item of wardrobe) {
      for (const img of item.images) {
        expect(existsSync(join(__dirname, "..", "public", img.src)), img.src).toBe(true);
      }
    }
  });
});

describe("recommendation engine", () => {
  it("generates only top + bottom + shoe combinations — socks never enter", () => {
    const candidates = allCandidates(NEUTRAL_CTX, EMPTY_USER);
    expect(candidates.length).toBe(7 * 8 * 2);
    const byId = new Map(wardrobe.map((i) => [i.id, i]));
    for (const c of candidates) {
      expect(byId.get(c.combo.top)?.category).toBe("top");
      expect(byId.get(c.combo.bottom)?.category).toBe("bottom");
      expect(byId.get(c.combo.shoe)?.category).toBe("shoe");
    }
    const sockIds = wardrobe.filter((i) => i.category === "sock").map((i) => i.id);
    for (const c of candidates) {
      expect(sockIds).not.toContain(c.combo.top);
      expect(sockIds).not.toContain(c.combo.bottom);
      expect(sockIds).not.toContain(c.combo.shoe);
    }
  });

  it("HIMLAND participates in candidate combinations", () => {
    const candidates = allCandidates(NEUTRAL_CTX, EMPTY_USER);
    expect(candidates.some((c) => c.combo.bottom === "bottom-004")).toBe(true);
  });

  it("FILA slides participate as a shoe option", () => {
    const candidates = allCandidates(NEUTRAL_CTX, EMPTY_USER);
    expect(candidates.some((c) => c.combo.shoe === "shoe-002")).toBe(true);
  });

  it("FILA slides are not recommended for factory or customer visits", () => {
    const fila = wardrobe.find((i) => i.id === "shoe-002")!;
    expect(fila.occasions).not.toContain("factory");
    expect(fila.occasions).not.toContain("customer-visit");
  });

  it("the requested FILA pairings all rank in the top half of its combinations", () => {
    // Pairing intent is expressed through metadata, not hard-coded scoring —
    // this asserts the metadata actually produces the intended affinities.
    const filaCombos = allCandidates(NEUTRAL_CTX, EMPTY_USER).filter(
      (c) => c.combo.shoe === "shoe-002",
    );
    const median = filaCombos[Math.floor(filaCombos.length / 2)].breakdown.total;
    const requested: [string, string][] = [
      ["top-006", "bottom-007"], // COS black tee + grey sweatshorts
      ["top-006", "bottom-008"], // COS black tee + black interlock shorts
      ["top-007", "bottom-007"], // H&M COOLMAX white + grey sweatshorts
      ["top-007", "bottom-008"], // H&M COOLMAX white + black interlock shorts
    ];
    for (const [top, bottom] of requested) {
      const combo = filaCombos.find((c) => c.combo.top === top && c.combo.bottom === bottom);
      expect(combo, `${top}+${bottom} missing`).toBeDefined();
      expect(combo!.breakdown.total).toBeGreaterThanOrEqual(median);
    }
  });
});

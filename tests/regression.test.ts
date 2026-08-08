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
  it("has exactly 17 items", () => {
    expect(wardrobe).toHaveLength(17);
  });

  it("has 7 tops / 8 bottoms / 1 shoe / 1 sock", () => {
    const count = (c: string) => wardrobe.filter((i) => i.category === c).length;
    expect(count("top")).toBe(7);
    expect(count("bottom")).toBe(8);
    expect(count("shoe")).toBe(1);
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
    expect(candidates.length).toBe(7 * 8 * 1);
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
});

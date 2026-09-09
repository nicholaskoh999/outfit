import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { wardrobe } from "@/lib/data";
import { isNeutral, pairLabel, pairScore } from "@/lib/colors";
import { allCandidates } from "@/lib/recommend";
import { DEFAULT_STUDIO, migrateUserState } from "@/lib/store";
import { AVATAR_BOTTOM, AVATAR_HEIGHT, bodyLandmarks, garmentGeometry, shoeGeometry } from "@/lib/studioGeometry";
import { affineFromTriangles, garmentMesh, transformPoint, type MeshTriangle } from "@/lib/studioMesh";
import type { ColorFamily, UserState, WardrobeItem } from "@/lib/types";

const EMPTY_USER: UserState = {
  favoriteLooks: [],
  favoritePieces: [],
  decisions: {},
  wearLog: [],
  statusOverrides: {},
  studio: DEFAULT_STUDIO,
};

const NEUTRAL_CTX = {
  occasion: null,
  refine: { weather: null, style: null, workContext: null },
} as const;

describe("wardrobe inventory", () => {
  it("has exactly 20 items", () => {
    expect(wardrobe).toHaveLength(20);
  });

  it("has 9 tops / 8 bottoms / 2 shoes / 1 sock", () => {
    const count = (c: string) => wardrobe.filter((i) => i.category === c).length;
    expect(count("top")).toBe(9);
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

  it("Turbo purple tee (top-008) is present with its real hero image", () => {
    const turbo = wardrobe.find((i) => i.id === "top-008");
    expect(turbo?.name).toBe("Turbo BT-T068 Essential Oversize T-Shirt");
    expect(turbo?.brand).toBe("TURBO");
    expect(turbo?.slug).toBe("turbo-bt-t068-essential-oversize-t-shirt-purple");
    expect(turbo?.category).toBe("top");
    expect(turbo?.type).toBe("tee");
    expect(turbo?.fit).toBe("oversized");
    expect(turbo?.status).toBe("active");
    expect(turbo?.color.family).toBe("purple");
    const hero = turbo?.images.find((img) => img.type === "hero");
    expect(hero?.src).toBe("/assets/tops/turbo-bt-t068-essential-oversize-t-shirt-purple.webp");
    expect(existsSync(join(__dirname, "..", "public", hero!.src))).toBe(true);
  });

  it("STWD pink sweatshirt (top-009) is present with its real hero image", () => {
    const stwd = wardrobe.find((i) => i.id === "top-009");
    expect(stwd?.name).toBe("STWD Short Sleeve Sweatshirt");
    expect(stwd?.brand).toBe("STWD");
    expect(stwd?.slug).toBe("stwd-short-sleeve-sweatshirt-pink");
    expect(stwd?.category).toBe("top");
    expect(stwd?.type).toBe("short_sleeve_sweatshirt");
    expect(stwd?.status).toBe("active");
    expect(stwd?.color.family).toBe("pink");
    const hero = stwd?.images.find((img) => img.type === "hero");
    expect(hero?.src).toBe("/assets/tops/stwd-short-sleeve-sweatshirt-pink.webp");
    expect(existsSync(join(__dirname, "..", "public", hero!.src))).toBe(true);
  });

  it("does not invent unsupplied specs for the two new tops", () => {
    // fit/material/size were never supplied for the STWD sweatshirt, and no
    // material, size, price or purchase date was supplied for either piece.
    const stwd = wardrobe.find((i) => i.id === "top-009")!;
    expect(stwd.fit).toBeNull();
    expect(stwd.material).toBeUndefined();
    expect(stwd.size).toBeUndefined();
    for (const id of ["top-008", "top-009"]) {
      const item = wardrobe.find((i) => i.id === id)!;
      expect(item.material, id).toBeUndefined();
      expect(item.size, id).toBeUndefined();
      expect(item.purchase, id).toBeUndefined();
    }
  });

  it("every referenced image asset exists on disk", () => {
    for (const item of wardrobe) {
      for (const img of item.images) {
        expect(existsSync(join(__dirname, "..", "public", img.src)), img.src).toBe(true);
      }
    }
  });
});

describe("purple / pink colour handling", () => {
  const ALL_FAMILIES: ColorFamily[] = [
    "black",
    "charcoal",
    "grey",
    "white",
    "beige",
    "baby-blue",
    "greenish-blue",
    "apricot",
    "brown",
    "purple",
    "pink",
  ];
  const NEW_FAMILIES: ColorFamily[] = ["purple", "pink"];
  // pairScore()'s fallback values — an explicit rating must not equal these.
  const FALLBACK_SAME = 6.0;
  const FALLBACK_MIXED_NEUTRAL = 7.0;
  const FALLBACK_NON_NEUTRAL = 5.0;

  it("rates every pairing with purple and pink explicitly, in both directions", () => {
    for (const nf of NEW_FAMILIES) {
      for (const other of ALL_FAMILIES) {
        const score = pairScore(nf, other);
        expect(score, `${nf}+${other}`).toBe(pairScore(other, nf));
        expect(score, `${nf}+${other}`).toBeGreaterThan(0);
        expect(score, `${nf}+${other}`).toBeLessThanOrEqual(10);
        const fallback =
          nf === other
            ? FALLBACK_SAME
            : isNeutral(other)
              ? FALLBACK_MIXED_NEUTRAL
              : FALLBACK_NON_NEUTRAL;
        expect(score, `${nf}+${other} fell through to the default`).not.toBe(fallback);
      }
    }
  });

  it("anchors purple and pink on the useful neutrals", () => {
    for (const nf of NEW_FAMILIES) {
      for (const neutral of ["black", "charcoal", "grey", "white"] as ColorFamily[]) {
        expect(pairScore(nf, neutral), `${nf}+${neutral}`).toBeGreaterThanOrEqual(8.5);
      }
      // Less obvious pairings stay deliberately more conservative.
      for (const loud of ["apricot", "greenish-blue"] as ColorFamily[]) {
        expect(pairScore(nf, loud), `${nf}+${loud}`).toBeLessThan(
          pairScore(nf, "grey"),
        );
      }
      // Tonal flooding is never the recommended move.
      expect(pairScore(nf, nf), `${nf}+${nf}`).toBeLessThan(pairScore(nf, "black"));
    }
  });

  it("keeps purple and pink out of the neutral set", () => {
    expect(isNeutral("purple")).toBe(false);
    expect(isNeutral("pink")).toBe(false);
  });

  it("labels purple and pink pairings without falling through to undefined", () => {
    for (const nf of NEW_FAMILIES) {
      for (const other of ALL_FAMILIES) {
        const label = pairLabel(nf, other);
        expect(label, `${nf}+${other}`).not.toMatch(/undefined/);
        expect(label, `${nf}+${other}`).toContain(" + ");
      }
    }
    expect(pairLabel("purple", "black")).toBe("purple + black");
    expect(pairLabel("pink", "charcoal")).toBe("pink + charcoal");
  });

  it("leaves the existing pair matrix untouched", () => {
    expect(pairScore("charcoal", "black")).toBe(9.5);
    expect(pairScore("baby-blue", "black")).toBe(9.5);
    expect(pairScore("beige", "black")).toBe(9.5);
    expect(pairScore("white", "grey")).toBe(9.5);
    expect(pairScore("greenish-blue", "black")).toBe(9.5);
    expect(pairScore("charcoal", "apricot")).toBe(8.2);
    expect(pairScore("brown", "white")).toBe(8.8);
    expect(pairScore("grey", "grey")).toBe(5.8);
  });
});

describe("recommendation engine", () => {
  it("generates only top + bottom + shoe combinations — socks never enter", () => {
    const candidates = allCandidates(NEUTRAL_CTX, EMPTY_USER);
    expect(candidates.length).toBe(9 * 8 * 2);
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

  it("both new tops participate in candidate combinations", () => {
    const candidates = allCandidates(NEUTRAL_CTX, EMPTY_USER);
    for (const id of ["top-008", "top-009"]) {
      const mine = candidates.filter((c) => c.combo.top === id);
      expect(mine.length, id).toBe(8 * 2);
      for (const c of mine) expect(Number.isFinite(c.breakdown.total), id).toBe(true);
    }
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

describe("Studio state migration", () => {
  it("extends legacy v1 state without clearing existing user data", () => {
    const legacy = {
      favoriteLooks: ["top-001_bottom-001_shoe-001"],
      favoritePieces: ["top-002"],
      decisions: { example: { verdict: "approved", date: "2026-01-01" } },
      wearLog: [{ key: "example", items: ["top-001"], date: "2026-01-01" }],
      statusOverrides: { "top-003": "laundry" },
    };
    const migrated = migrateUserState(legacy);
    expect(migrated.favoriteLooks).toEqual(legacy.favoriteLooks);
    expect(migrated.favoritePieces).toEqual(legacy.favoritePieces);
    expect(migrated.decisions).toEqual(legacy.decisions);
    expect(migrated.wearLog).toEqual(legacy.wearLog);
    expect(migrated.statusOverrides).toEqual(legacy.statusOverrides);
    expect(migrated.studio).toEqual(DEFAULT_STUDIO);
  });

  it("has one complete calibrated Studio outfit with landmarks and valid texture assets", () => {
    const calibrated = [
      ["top-002", "top"],
      ["bottom-006", "bottom"],
      ["shoe-001", "shoe"],
    ] as const;
    for (const [id, slot] of calibrated) {
      const item = wardrobe.find((entry) => entry.id === id)!;
      expect(item.tryOn?.slot, id).toBe(slot);
      expect(item.tryOn?.asset, id).toMatch(/^\/assets\/studio\/.+\.svg$/);
      expect(item.tryOn?.textureAsset, id).toBe(item.images.find((image) => image.type === "hero")!.src);
      expect(item.tryOn?.fitProfile, id).toBe(item.fit ?? "regular");
      expect(Object.keys(item.tryOn?.anchors ?? {}).length, id).toBeGreaterThanOrEqual(5);
      expect(item.tryOn?.sourcePath, id).toMatch(/^M.+z$/i);
      const assetPath = join(__dirname, "..", "public", item.tryOn!.asset!);
      expect(existsSync(assetPath), item.tryOn!.asset).toBe(true);
      const texturePath = join(__dirname, "..", "public", item.tryOn!.textureAsset!);
      expect(existsSync(texturePath), item.tryOn!.textureAsset).toBe(true);
      const asset = readFileSync(assetPath, "utf8");
      expect(asset, id).toContain("clipPath");
      expect(asset, id).toContain(item.images.find((image) => image.type === "hero")!.src.split("/").at(-1)!);
      expect(asset, id).not.toContain("<rect");
    }
  });

  it("uses required source anchors for each calibrated garment slot", () => {
    const required = {
      "top-002": ["neckLeft", "neckRight", "shoulderLeft", "shoulderRight", "sleeveOuterLeft", "sleeveOuterRight", "chestLeft", "chestRight", "hemLeft", "hemRight"],
      "bottom-006": ["waistLeft", "waistRight", "hipLeft", "hipRight", "crotch", "leftKneeOuter", "rightKneeOuter", "leftHemOuter", "rightHemOuter"],
      "shoe-001": ["heelTop", "upper", "toe", "soleHeel", "soleToe", "center"],
    } as const;
    for (const [id, anchors] of Object.entries(required)) {
      const item = wardrobe.find((entry) => entry.id === id)!;
      for (const anchor of anchors) expect(item.tryOn?.anchors[anchor], `${id}:${anchor}`).toHaveLength(2);
    }
  });

  it("maps every affine triangle vertex to its requested target", () => {
    const source = [{ x: 12, y: 15 }, { x: 80, y: 25 }, { x: 30, y: 95 }] as const;
    const target = [{ x: 100, y: 40 }, { x: 175, y: 62 }, { x: 88, y: 160 }] as const;
    const matrix = affineFromTriangles(source, target);
    source.forEach((point, index) => {
      const mapped = transformPoint(matrix, point);
      expect(mapped.x).toBeCloseTo(target[index].x, 8);
      expect(mapped.y).toBeCloseTo(target[index].y, 8);
    });
  });

  const assertMeshVertex = (triangle: MeshTriangle, anchor: string) => {
    const index = triangle.names.indexOf(anchor);
    expect(index, `mesh does not contain ${anchor}`).toBeGreaterThanOrEqual(0);
    const mapped = transformPoint(triangle.matrix, triangle.source[index]);
    expect(mapped.x).toBeCloseTo(triangle.target[index].x, 7);
    expect(mapped.y).toBeCloseTo(triangle.target[index].y, 7);
  };

  it("maps the calibrated tee shoulders and hem to fitted target landmarks", () => {
    const item = wardrobe.find((entry) => entry.id === "top-002")!;
    const geometry = garmentGeometry(item, 72);
    const mesh = garmentMesh(item, geometry);
    for (const anchor of ["shoulderLeft", "shoulderRight", "hemLeft", "hemRight"]) {
      assertMeshVertex(mesh.find((region) => region.names.includes(anchor))!, anchor);
    }
  });

  it("maps the calibrated trouser crotch and both leg hems", () => {
    const item = wardrobe.find((entry) => entry.id === "bottom-006")!;
    const geometry = garmentGeometry(item, 72);
    const mesh = garmentMesh(item, geometry);
    for (const anchor of ["crotch", "leftHemInner", "leftHemOuter", "rightHemInner", "rightHemOuter"]) {
      assertMeshVertex(mesh.find((region) => region.names.includes(anchor))!, anchor);
    }
  });

  it("uses genuinely non-uniform affine regions instead of one garment matrix", () => {
    for (const id of ["top-002", "bottom-006", "shoe-001"]) {
      const item = wardrobe.find((entry) => entry.id === id)!;
      const matrices = garmentMesh(item, garmentGeometry(item, 72)).map(({ matrix }) =>
        [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].map((value) => value.toFixed(6)).join(","),
      );
      expect(new Set(matrices).size, id).toBeGreaterThan(1);
    }
  });

  it("maps the reused shoe source independently to the left and right feet", () => {
    const item = wardrobe.find((entry) => entry.id === "shoe-001")!;
    const body = bodyLandmarks(72);
    const left = shoeGeometry(item, body, "left");
    const right = shoeGeometry(item, body, "right");
    expect(left.anchors.toe.x).toBeLessThan(body.ankleLeft.x);
    expect(right.anchors.toe.x).toBeGreaterThan(body.ankleRight.x);
    expect(left.anchors.soleToe.y).toBe(AVATAR_BOTTOM);
    expect(right.anchors.soleToe.y).toBe(AVATAR_BOTTOM);
    assertMeshVertex(garmentMesh(item, left).find((region) => region.names.includes("toe"))!, "toe");
    assertMeshVertex(garmentMesh(item, right).find((region) => region.names.includes("toe"))!, "toe");
  });

  it("keeps the avatar at 7.38 heads and changes only horizontal body landmarks with weight", () => {
    const light = bodyLandmarks(55);
    const heavy = bodyLandmarks(90);
    expect(AVATAR_HEIGHT / (light.headBottom.y - light.headTop.y)).toBeCloseTo(7.38, 1);
    for (const name of ["headTop", "headBottom", "shoulderLeft", "chestLeft", "waistLeft", "hipLeft", "crotch", "kneeLeft", "ankleLeft", "leftFoot"] as const) {
      expect(heavy[name].y, name).toBe(light[name].y);
    }
    expect(heavy.shoulderLeft.x).toBeLessThan(light.shoulderLeft.x);
    expect(heavy.waistLeft.x).toBeLessThan(light.waistLeft.x);
    expect(heavy.hipLeft.x).toBeLessThan(light.hipLeft.x);
    const top = wardrobe.find((entry) => entry.id === "top-002")!;
    const lightTop = garmentGeometry(top, 55).anchors;
    const heavyTop = garmentGeometry(top, 90).anchors;
    expect(heavyTop.shoulderLeft.x).toBeLessThan(lightTop.shoulderLeft.x);
    expect(heavyTop.chestLeft.x).toBeLessThan(lightTop.chestLeft.x);
    expect(heavyTop.hemLeft.x).toBeLessThan(lightTop.hemLeft.x);
    expect(heavyTop.hemLeft.y).toBe(lightTop.hemLeft.y);
  });

  it("derives garment geometry from weight, type and fit profile", () => {
    const top = wardrobe.find((entry) => entry.id === "top-002")!;
    const regular = garmentGeometry(top, 72);
    const oversized = garmentGeometry({ ...top, fit: "oversized", tryOn: { ...top.tryOn!, fitProfile: "oversized" } } as WardrobeItem, 72);
    expect(oversized.bounds.width).toBeGreaterThan(regular.bounds.width);
    expect(oversized.bounds.height).toBeGreaterThan(regular.bounds.height);
    expect(garmentGeometry(top, 90).bounds.width).toBeGreaterThan(garmentGeometry(top, 55).bounds.width);

    const trousers = wardrobe.find((entry) => entry.id === "bottom-006")!;
    const wide = garmentGeometry({ ...trousers, fit: "wide", tryOn: { ...trousers.tryOn!, fitProfile: "wide" } } as WardrobeItem, 72);
    expect(wide.bounds.width).toBeGreaterThan(garmentGeometry(trousers, 72).bounds.width);
    const shorts = wardrobe.find((entry) => entry.id === "bottom-004")!;
    expect(garmentGeometry(shorts, 72).bounds.height).toBeLessThan(garmentGeometry(trousers, 72).bounds.height);
  });

  it("gives unsupported garments a complete fit-driven fallback silhouette", () => {
    const unsupported = wardrobe.find((entry) => entry.id === "top-001")!;
    expect(unsupported.tryOn).toBeUndefined();
    const geometry = garmentGeometry(unsupported, 72);
    expect(geometry.fitProfile).toBe("oversized");
    expect(geometry.path.endsWith("Z")).toBe(true);
    expect(geometry.bounds.width).toBeGreaterThan(0);
  });

  it("restores and bounds a persisted Studio draft", () => {
    const migrated = migrateUserState({
      studio: {
        weight: 120,
        topId: "top-006",
        bottomId: "bottom-008",
        shoeId: "shoe-002",
        savedLooks: ["top-006_bottom-008_shoe-002"],
      },
    });
    expect(migrated.studio).toEqual({
      weight: 90,
      topId: "top-006",
      bottomId: "bottom-008",
      shoeId: "shoe-002",
      savedLooks: ["top-006_bottom-008_shoe-002"],
    });
  });
});

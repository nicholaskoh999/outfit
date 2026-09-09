import type { GarmentGeometry, Point } from "./studioGeometry";
import type { WardrobeItem } from "./types";

export type Triangle = readonly [Point, Point, Point];

export interface AffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface MeshTriangle {
  names: readonly [string, string, string];
  source: Triangle;
  target: Triangle;
  matrix: AffineMatrix;
}

const triangle = (a: string, b: string, c: string): readonly [string, string, string] => [a, b, c];

const TOP_MESH = [
  triangle("neckLeft", "neckCenter", "chestCenter"),
  triangle("neckLeft", "chestCenter", "chestLeft"),
  triangle("neckCenter", "neckRight", "chestCenter"),
  triangle("neckRight", "chestRight", "chestCenter"),
  triangle("neckLeft", "shoulderLeft", "chestLeft"),
  triangle("shoulderLeft", "sleeveOuterLeft", "sleeveInnerLeft"),
  triangle("shoulderLeft", "sleeveInnerLeft", "chestLeft"),
  triangle("neckRight", "chestRight", "shoulderRight"),
  triangle("shoulderRight", "chestRight", "sleeveInnerRight"),
  triangle("shoulderRight", "sleeveInnerRight", "sleeveOuterRight"),
  triangle("chestLeft", "chestCenter", "hemLeft"),
  triangle("chestCenter", "hemCenter", "hemLeft"),
  triangle("chestCenter", "chestRight", "hemRight"),
  triangle("chestCenter", "hemRight", "hemCenter"),
] as const;

const BOTTOM_MESH = [
  triangle("waistLeft", "waistCenter", "pelvisCenter"),
  triangle("waistLeft", "pelvisCenter", "hipLeft"),
  triangle("hipLeft", "pelvisCenter", "leftThighOuter"),
  triangle("leftThighOuter", "pelvisCenter", "leftThighInner"),
  triangle("leftThighInner", "pelvisCenter", "crotch"),
  triangle("crotch", "pelvisCenter", "rightThighInner"),
  triangle("rightThighInner", "pelvisCenter", "rightThighOuter"),
  triangle("rightThighOuter", "pelvisCenter", "hipRight"),
  triangle("hipRight", "pelvisCenter", "waistRight"),
  triangle("waistRight", "pelvisCenter", "waistCenter"),
  triangle("leftThighOuter", "leftKneeOuter", "leftKneeInner"),
  triangle("leftThighOuter", "leftKneeInner", "leftThighInner"),
  triangle("leftKneeOuter", "leftHemOuter", "leftHemInner"),
  triangle("leftKneeOuter", "leftHemInner", "leftKneeInner"),
  triangle("rightThighInner", "rightKneeInner", "rightKneeOuter"),
  triangle("rightThighInner", "rightKneeOuter", "rightThighOuter"),
  triangle("rightKneeInner", "rightHemInner", "rightHemOuter"),
  triangle("rightKneeInner", "rightHemOuter", "rightKneeOuter"),
] as const;

const SHOE_BOUNDARY = ["heelTop", "upper", "toeTop", "toe", "soleToe", "soleHeel", "heel"] as const;
const SHOE_MESH = SHOE_BOUNDARY.map((name, index) => triangle("center", name, SHOE_BOUNDARY[(index + 1) % SHOE_BOUNDARY.length]));

export function affineFromTriangles(source: Triangle, target: Triangle): AffineMatrix {
  const [s0, s1, s2] = source;
  const [t0, t1, t2] = target;
  const sx1 = s1.x - s0.x;
  const sx2 = s2.x - s0.x;
  const sy1 = s1.y - s0.y;
  const sy2 = s2.y - s0.y;
  const determinant = sx1 * sy2 - sx2 * sy1;
  if (Math.abs(determinant) < 1e-8) throw new Error("Cannot map a degenerate source triangle");
  const tx1 = t1.x - t0.x;
  const tx2 = t2.x - t0.x;
  const ty1 = t1.y - t0.y;
  const ty2 = t2.y - t0.y;
  const a = (tx1 * sy2 - tx2 * sy1) / determinant;
  const c = (-tx1 * sx2 + tx2 * sx1) / determinant;
  const b = (ty1 * sy2 - ty2 * sy1) / determinant;
  const d = (-ty1 * sx2 + ty2 * sx1) / determinant;
  return {
    a,
    b,
    c,
    d,
    e: t0.x - a * s0.x - c * s0.y,
    f: t0.y - b * s0.x - d * s0.y,
  };
}

export function transformPoint(matrix: AffineMatrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export function matrixToSvg(matrix: AffineMatrix): string {
  return `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`;
}

export function meshTopology(slot: GarmentGeometry["slot"]): readonly (readonly [string, string, string])[] {
  if (slot === "top") return TOP_MESH;
  if (slot === "bottom") return BOTTOM_MESH;
  return SHOE_MESH;
}

export function garmentMesh(item: WardrobeItem, geometry: GarmentGeometry): MeshTriangle[] {
  const sourceAnchors = item.tryOn?.anchors;
  if (!sourceAnchors) return [];
  return meshTopology(geometry.slot).map((names) => {
    const source = names.map((name) => {
      const point = sourceAnchors[name];
      if (!point) throw new Error(`Missing source anchor ${item.id}:${name}`);
      return { x: point[0], y: point[1] };
    }) as unknown as Triangle;
    const target = names.map((name) => {
      const point = geometry.anchors[name];
      if (!point) throw new Error(`Missing target anchor ${item.id}:${name}`);
      return point;
    }) as unknown as Triangle;
    return { names, source, target, matrix: affineFromTriangles(source, target) };
  });
}

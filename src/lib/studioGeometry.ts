import type { Fit, WardrobeItem } from "./types";

export interface Point { x: number; y: number }

export interface BodyLandmarks {
  headTop: Point;
  headBottom: Point;
  neckLeft: Point;
  neckRight: Point;
  shoulderLeft: Point;
  shoulderRight: Point;
  chestLeft: Point;
  chestRight: Point;
  waistLeft: Point;
  waistRight: Point;
  hipLeft: Point;
  hipRight: Point;
  crotch: Point;
  kneeLeft: Point;
  kneeRight: Point;
  ankleLeft: Point;
  ankleRight: Point;
  leftFoot: Point;
  rightFoot: Point;
  shoulderHalf: number;
  chestHalf: number;
  waistHalf: number;
  hipHalf: number;
  thighHalf: number;
  kneeHalf: number;
  ankleHalf: number;
}

export interface Bounds { x: number; y: number; width: number; height: number }

export interface GarmentGeometry {
  slot: "top" | "bottom" | "shoe";
  fitProfile: Fit;
  path: string;
  bounds: Bounds;
  seamPaths: string[];
}

export const AVATAR_TOP = 40;
export const AVATAR_BOTTOM = 542;
export const AVATAR_HEIGHT = AVATAR_BOTTOM - AVATAR_TOP;

const clampWeight = (weight: number) => Math.min(90, Math.max(55, weight));

export function bodyLandmarks(weight: number): BodyLandmarks {
  const t = (clampWeight(weight) - 55) / 35;
  const shoulderHalf = 50 + t * 10;
  const chestHalf = 41 + t * 14;
  const waistHalf = 29 + t * 20;
  const hipHalf = 34 + t * 15;
  const thighHalf = 18 + t * 8;
  const kneeHalf = 12.5 + t * 3;
  const ankleHalf = 8 + t * 1.5;
  return {
    headTop: { x: 160, y: AVATAR_TOP },
    headBottom: { x: 160, y: 108 },
    neckLeft: { x: 147, y: 116 },
    neckRight: { x: 173, y: 116 },
    shoulderLeft: { x: 160 - shoulderHalf, y: 142 },
    shoulderRight: { x: 160 + shoulderHalf, y: 142 },
    chestLeft: { x: 160 - chestHalf, y: 184 },
    chestRight: { x: 160 + chestHalf, y: 184 },
    waistLeft: { x: 160 - waistHalf, y: 232 },
    waistRight: { x: 160 + waistHalf, y: 232 },
    hipLeft: { x: 160 - hipHalf, y: 272 },
    hipRight: { x: 160 + hipHalf, y: 272 },
    crotch: { x: 160, y: 298 },
    kneeLeft: { x: 143, y: 401 },
    kneeRight: { x: 177, y: 401 },
    ankleLeft: { x: 145, y: 521 },
    ankleRight: { x: 175, y: 521 },
    leftFoot: { x: 126, y: AVATAR_BOTTOM },
    rightFoot: { x: 194, y: AVATAR_BOTTOM },
    shoulderHalf,
    chestHalf,
    waistHalf,
    hipHalf,
    thighHalf,
    kneeHalf,
    ankleHalf,
  };
}

const TOP_PROFILES: Record<Fit, { shoulder: number; chest: number; hem: number; length: number; drop: number; sleeve: number }> = {
  slim: { shoulder: -1, chest: 2, hem: 1, length: 30, drop: 0, sleeve: 46 },
  regular: { shoulder: 3, chest: 7, hem: 6, length: 36, drop: 1, sleeve: 52 },
  relaxed: { shoulder: 8, chest: 13, hem: 14, length: 43, drop: 4, sleeve: 60 },
  loose: { shoulder: 13, chest: 19, hem: 21, length: 49, drop: 7, sleeve: 68 },
  wide: { shoulder: 14, chest: 22, hem: 25, length: 46, drop: 7, sleeve: 66 },
  oversized: { shoulder: 19, chest: 25, hem: 28, length: 57, drop: 10, sleeve: 78 },
};

const BOTTOM_PROFILES: Record<Fit, { waist: number; hip: number; thigh: number; knee: number; hem: number }> = {
  slim: { waist: 1, hip: 2, thigh: 1, knee: 9, hem: 8 },
  regular: { waist: 3, hip: 4, thigh: 3, knee: 11, hem: 10 },
  relaxed: { waist: 5, hip: 7, thigh: 6, knee: 14, hem: 13 },
  loose: { waist: 7, hip: 10, thigh: 9, knee: 17, hem: 16 },
  wide: { waist: 8, hip: 13, thigh: 13, knee: 21, hem: 21 },
  oversized: { waist: 9, hip: 14, thigh: 14, knee: 22, hem: 22 },
};

export function resolvedFit(item: WardrobeItem): Fit {
  if (item.tryOn?.fitProfile) return item.tryOn.fitProfile;
  if (item.fit) return item.fit;
  if (item.type.includes("sweatshirt")) return "relaxed";
  return "regular";
}

export function topGeometry(item: WardrobeItem, body: BodyLandmarks): GarmentGeometry {
  const fitProfile = resolvedFit(item);
  const profile = TOP_PROFILES[fitProfile];
  const shoulderY = body.shoulderLeft.y + profile.drop;
  const shoulderLeft = body.shoulderLeft.x - profile.shoulder;
  const shoulderRight = body.shoulderRight.x + profile.shoulder;
  const chestLeft = body.chestLeft.x - profile.chest;
  const chestRight = body.chestRight.x + profile.chest;
  const hemY = body.waistLeft.y + profile.length;
  const hemLeft = body.waistLeft.x - profile.hem;
  const hemRight = body.waistRight.x + profile.hem;
  const longSleeve = item.type.includes("long_sleeve");
  const sleeveY = longSleeve ? 306 : shoulderY + profile.sleeve;
  const sleeveOuter = longSleeve ? 13 : 18;
  const sleeveInner = longSleeve ? 2 : 2;
  const neckY = body.neckLeft.y + 3;
  const path = [
    `M ${body.neckLeft.x} ${neckY}`,
    `Q 160 ${neckY + 12} ${body.neckRight.x} ${neckY}`,
    `C ${body.neckRight.x + 10} ${neckY + 7} ${shoulderRight - 12} ${shoulderY - 3} ${shoulderRight} ${shoulderY}`,
    `L ${shoulderRight + sleeveOuter} ${sleeveY}`,
    `Q ${shoulderRight + 9} ${sleeveY + 7} ${shoulderRight - sleeveInner} ${sleeveY + 4}`,
    `L ${chestRight} ${body.chestRight.y}`,
    `Q ${hemRight + 2} ${body.waistRight.y + 8} ${hemRight} ${hemY}`,
    `Q 160 ${hemY + 5} ${hemLeft} ${hemY}`,
    `Q ${hemLeft - 2} ${body.waistLeft.y + 8} ${chestLeft} ${body.chestLeft.y}`,
    `L ${shoulderLeft + sleeveInner} ${sleeveY + 4}`,
    `Q ${shoulderLeft - 9} ${sleeveY + 7} ${shoulderLeft - sleeveOuter} ${sleeveY}`,
    `L ${shoulderLeft} ${shoulderY}`,
    `C ${shoulderLeft + 12} ${shoulderY - 3} ${body.neckLeft.x - 10} ${neckY + 7} ${body.neckLeft.x} ${neckY} Z`,
  ].join(" ");
  return {
    slot: "top",
    fitProfile,
    path,
    bounds: { x: shoulderLeft - sleeveOuter, y: neckY, width: shoulderRight - shoulderLeft + sleeveOuter * 2, height: hemY - neckY + 5 },
    seamPaths: [
      `M ${body.neckLeft.x} ${neckY} Q 160 ${neckY + 12} ${body.neckRight.x} ${neckY}`,
      `M ${hemLeft + 3} ${hemY - 3} Q 160 ${hemY + 1} ${hemRight - 3} ${hemY - 3}`,
    ],
  };
}

export function bottomGeometry(item: WardrobeItem, body: BodyLandmarks): GarmentGeometry {
  const fitProfile = resolvedFit(item);
  const profile = BOTTOM_PROFILES[fitProfile];
  const shorts = item.type.includes("short");
  const waistY = body.waistLeft.y + 18;
  const hipY = body.hipLeft.y;
  const crotchY = body.crotch.y + (shorts ? -1 : 2);
  const hemY = shorts ? 352 : body.ankleLeft.y + 3;
  const waistLeft = body.waistLeft.x - profile.waist;
  const waistRight = body.waistRight.x + profile.waist;
  const hipLeft = body.hipLeft.x - profile.hip;
  const hipRight = body.hipRight.x + profile.hip;
  const thighOuterLeft = 160 - body.thighHalf - profile.thigh - 8;
  const thighOuterRight = 160 + body.thighHalf + profile.thigh + 8;
  const leftLegCenter = 143;
  const rightLegCenter = 177;
  const kneeLeftOuter = leftLegCenter - profile.knee;
  const kneeLeftInner = Math.min(156, leftLegCenter + profile.knee);
  const kneeRightInner = Math.max(164, rightLegCenter - profile.knee);
  const kneeRightOuter = rightLegCenter + profile.knee;
  const hemLeftOuter = leftLegCenter - profile.hem;
  const hemLeftInner = Math.min(157, leftLegCenter + profile.hem);
  const hemRightInner = Math.max(163, rightLegCenter - profile.hem);
  const hemRightOuter = rightLegCenter + profile.hem;
  const path = [
    `M ${waistLeft} ${waistY}`,
    `Q 160 ${waistY + 4} ${waistRight} ${waistY}`,
    `C ${waistRight + 2} ${hipY - 5} ${hipRight} ${hipY} ${thighOuterRight} ${crotchY}`,
    `L ${kneeRightOuter} ${shorts ? hemY - 18 : body.kneeRight.y}`,
    `L ${hemRightOuter} ${hemY}`,
    `L ${hemRightInner} ${hemY}`,
    `L ${kneeRightInner} ${shorts ? hemY - 18 : body.kneeRight.y}`,
    `L 165 ${crotchY}`,
    `Q 160 ${crotchY + 10} 155 ${crotchY}`,
    `L ${kneeLeftInner} ${shorts ? hemY - 18 : body.kneeLeft.y}`,
    `L ${hemLeftInner} ${hemY}`,
    `L ${hemLeftOuter} ${hemY}`,
    `L ${kneeLeftOuter} ${shorts ? hemY - 18 : body.kneeLeft.y}`,
    `L ${thighOuterLeft} ${crotchY}`,
    `C ${hipLeft} ${hipY} ${waistLeft - 2} ${hipY - 5} ${waistLeft} ${waistY} Z`,
  ].join(" ");
  return {
    slot: "bottom",
    fitProfile,
    path,
    bounds: { x: Math.min(hipLeft, hemLeftOuter), y: waistY, width: Math.max(hipRight, hemRightOuter) - Math.min(hipLeft, hemLeftOuter), height: hemY - waistY },
    seamPaths: [
      `M ${waistLeft + 2} ${waistY + 5} Q 160 ${waistY + 9} ${waistRight - 2} ${waistY + 5}`,
      `M 160 ${waistY + 5} L 160 ${crotchY - 2}`,
    ],
  };
}

export function shoeGeometry(item: WardrobeItem, body: BodyLandmarks): GarmentGeometry {
  const fitProfile = resolvedFit(item);
  const ankle = body.ankleRight;
  const path = `M ${ankle.x - 8} ${ankle.y - 4} C ${ankle.x + 3} ${ankle.y - 5} ${ankle.x + 10} ${ankle.y + 1} ${ankle.x + 17} ${ankle.y + 7} C ${ankle.x + 26} ${ankle.y + 9} ${ankle.x + 34} ${ankle.y + 12} ${ankle.x + 37} ${ankle.y + 17} L ${ankle.x + 37} ${AVATAR_BOTTOM} L ${ankle.x - 10} ${AVATAR_BOTTOM} Q ${ankle.x - 13} ${ankle.y + 8} ${ankle.x - 8} ${ankle.y - 4} Z`;
  return {
    slot: "shoe",
    fitProfile,
    path,
    bounds: { x: ankle.x - 13, y: ankle.y - 5, width: 50, height: AVATAR_BOTTOM - ankle.y + 5 },
    seamPaths: [`M ${ankle.x - 9} ${AVATAR_BOTTOM - 4} L ${ankle.x + 35} ${AVATAR_BOTTOM - 4}`],
  };
}

export function garmentGeometry(item: WardrobeItem, weight: number): GarmentGeometry {
  const body = bodyLandmarks(weight);
  if (item.category === "top") return topGeometry(item, body);
  if (item.category === "bottom") return bottomGeometry(item, body);
  return shoeGeometry(item, body);
}

export function sourceBounds(item: WardrobeItem): Bounds | null {
  const anchors = item.tryOn?.anchors;
  if (!anchors) return null;
  const points = Object.values(anchors);
  if (!points.length) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

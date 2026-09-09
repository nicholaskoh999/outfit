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
  /** Explicit fitted landmarks consumed directly by the calibrated mesh. */
  anchors: Record<string, Point>;
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
  const neckY = body.neckLeft.y + 3;
  const anchors: Record<string, Point> = {
    neckLeft: { x: body.neckLeft.x, y: neckY },
    neckCenter: { x: 160, y: neckY + 13 },
    neckRight: { x: body.neckRight.x, y: neckY },
    shoulderLeft: { x: shoulderLeft, y: shoulderY },
    shoulderRight: { x: shoulderRight, y: shoulderY },
    sleeveOuterLeft: { x: shoulderLeft - sleeveOuter, y: sleeveY },
    sleeveOuterRight: { x: shoulderRight + sleeveOuter, y: sleeveY },
    sleeveInnerLeft: { x: shoulderLeft + 2, y: sleeveY + 4 },
    sleeveInnerRight: { x: shoulderRight - 2, y: sleeveY + 4 },
    chestLeft: { x: chestLeft, y: body.chestLeft.y },
    chestCenter: { x: 160, y: body.chestLeft.y },
    chestRight: { x: chestRight, y: body.chestRight.y },
    hemLeft: { x: hemLeft, y: hemY },
    hemCenter: { x: 160, y: hemY },
    hemRight: { x: hemRight, y: hemY },
  };
  const a = anchors;
  const path = [
    `M ${a.neckLeft.x} ${a.neckLeft.y}`,
    `Q 160 ${neckY + 12} ${a.neckRight.x} ${a.neckRight.y}`,
    `C ${body.neckRight.x + 10} ${neckY + 7} ${shoulderRight - 12} ${shoulderY - 3} ${a.shoulderRight.x} ${a.shoulderRight.y}`,
    `L ${a.sleeveOuterRight.x} ${a.sleeveOuterRight.y}`,
    `Q ${shoulderRight + 9} ${sleeveY + 7} ${a.sleeveInnerRight.x} ${a.sleeveInnerRight.y}`,
    `L ${a.chestRight.x} ${a.chestRight.y}`,
    `Q ${hemRight + 2} ${body.waistRight.y + 8} ${a.hemRight.x} ${a.hemRight.y}`,
    `Q 160 ${hemY + 5} ${a.hemLeft.x} ${a.hemLeft.y}`,
    `Q ${hemLeft - 2} ${body.waistLeft.y + 8} ${a.chestLeft.x} ${a.chestLeft.y}`,
    `L ${a.sleeveInnerLeft.x} ${a.sleeveInnerLeft.y}`,
    `Q ${shoulderLeft - 9} ${sleeveY + 7} ${a.sleeveOuterLeft.x} ${a.sleeveOuterLeft.y}`,
    `L ${a.shoulderLeft.x} ${a.shoulderLeft.y}`,
    `C ${shoulderLeft + 12} ${shoulderY - 3} ${body.neckLeft.x - 10} ${neckY + 7} ${a.neckLeft.x} ${a.neckLeft.y} Z`,
  ].join(" ");
  return {
    slot: "top",
    fitProfile,
    path,
    bounds: { x: a.sleeveOuterLeft.x, y: neckY, width: a.sleeveOuterRight.x - a.sleeveOuterLeft.x, height: hemY - neckY + 5 },
    seamPaths: [
      `M ${a.neckLeft.x} ${neckY} Q 160 ${neckY + 12} ${a.neckRight.x} ${neckY}`,
      `M ${hemLeft + 3} ${hemY - 3} Q 160 ${hemY + 1} ${hemRight - 3} ${hemY - 3}`,
    ],
    anchors,
  };
}

export function bottomGeometry(item: WardrobeItem, body: BodyLandmarks): GarmentGeometry {
  const fitProfile = resolvedFit(item);
  const profile = BOTTOM_PROFILES[fitProfile];
  const shorts = item.type.includes("short");
  const waistY = body.waistLeft.y + 18;
  const hipY = body.hipLeft.y;
  const crotchY = body.crotch.y + 10;
  const thighY = body.crotch.y + 7;
  const hemY = shorts ? 352 : body.ankleLeft.y + 7;
  const kneeY = shorts ? hemY - 10 : body.kneeLeft.y;
  const waistLeft = body.waistLeft.x - profile.waist;
  const waistRight = body.waistRight.x + profile.waist;
  const hipLeft = body.hipLeft.x - profile.hip;
  const hipRight = body.hipRight.x + profile.hip;
  const leftLegCenter = 143;
  const rightLegCenter = 177;
  const thighOuterLeft = 160 - body.thighHalf - profile.thigh - 8;
  const thighOuterRight = 160 + body.thighHalf + profile.thigh + 8;
  const kneeLeftOuter = leftLegCenter - profile.knee;
  const kneeLeftInner = Math.min(156, leftLegCenter + profile.knee);
  const kneeRightInner = Math.max(164, rightLegCenter - profile.knee);
  const kneeRightOuter = rightLegCenter + profile.knee;
  const hemLeftOuter = leftLegCenter - profile.hem;
  const hemLeftInner = Math.min(157, leftLegCenter + profile.hem);
  const hemRightInner = Math.max(163, rightLegCenter - profile.hem);
  const hemRightOuter = rightLegCenter + profile.hem;
  const anchors: Record<string, Point> = {
    waistLeft: { x: waistLeft, y: waistY },
    waistCenter: { x: 160, y: waistY + 2 },
    waistRight: { x: waistRight, y: waistY },
    hipLeft: { x: hipLeft, y: hipY },
    pelvisCenter: { x: 160, y: hipY + 5 },
    hipRight: { x: hipRight, y: hipY },
    leftThighOuter: { x: thighOuterLeft, y: thighY },
    leftThighInner: { x: 155, y: thighY },
    crotch: { x: 160, y: crotchY },
    rightThighInner: { x: 165, y: thighY },
    rightThighOuter: { x: thighOuterRight, y: thighY },
    leftKneeOuter: { x: kneeLeftOuter, y: kneeY },
    leftKneeInner: { x: kneeLeftInner, y: kneeY },
    rightKneeInner: { x: kneeRightInner, y: kneeY },
    rightKneeOuter: { x: kneeRightOuter, y: kneeY },
    leftHemOuter: { x: hemLeftOuter, y: hemY },
    leftHemInner: { x: hemLeftInner, y: hemY },
    rightHemInner: { x: hemRightInner, y: hemY },
    rightHemOuter: { x: hemRightOuter, y: hemY },
  };
  const a = anchors;
  const path = [
    `M ${a.waistLeft.x} ${a.waistLeft.y}`,
    `Q ${a.waistCenter.x} ${a.waistCenter.y + 2} ${a.waistRight.x} ${a.waistRight.y}`,
    `C ${waistRight + 2} ${hipY - 5} ${a.hipRight.x} ${a.hipRight.y} ${a.rightThighOuter.x} ${a.rightThighOuter.y}`,
    `L ${a.rightKneeOuter.x} ${a.rightKneeOuter.y} L ${a.rightHemOuter.x} ${a.rightHemOuter.y} L ${a.rightHemInner.x} ${a.rightHemInner.y}`,
    `L ${a.rightKneeInner.x} ${a.rightKneeInner.y} L ${a.rightThighInner.x} ${a.rightThighInner.y}`,
    `Q ${a.crotch.x} ${a.crotch.y + 2} ${a.leftThighInner.x} ${a.leftThighInner.y}`,
    `L ${a.leftKneeInner.x} ${a.leftKneeInner.y} L ${a.leftHemInner.x} ${a.leftHemInner.y} L ${a.leftHemOuter.x} ${a.leftHemOuter.y}`,
    `L ${a.leftKneeOuter.x} ${a.leftKneeOuter.y} L ${a.leftThighOuter.x} ${a.leftThighOuter.y}`,
    `C ${a.hipLeft.x} ${a.hipLeft.y} ${waistLeft - 2} ${hipY - 5} ${a.waistLeft.x} ${a.waistLeft.y} Z`,
  ].join(" ");
  const minX = Math.min(hipLeft, hemLeftOuter);
  const maxX = Math.max(hipRight, hemRightOuter);
  return {
    slot: "bottom",
    fitProfile,
    path,
    bounds: { x: minX, y: waistY, width: maxX - minX, height: hemY - waistY },
    seamPaths: [
      `M ${waistLeft + 2} ${waistY + 5} Q 160 ${waistY + 9} ${waistRight - 2} ${waistY + 5}`,
      `M 160 ${waistY + 5} L ${a.crotch.x} ${a.crotch.y - 2}`,
    ],
    anchors,
  };
}

export function shoeGeometry(item: WardrobeItem, body: BodyLandmarks, side: "left" | "right" = "right"): GarmentGeometry {
  const fitProfile = resolvedFit(item);
  const right = side === "right";
  const ankle = right ? body.ankleRight : body.ankleLeft;
  const direction = right ? 1 : -1;
  const point = (offsetX: number, y: number): Point => ({ x: ankle.x + offsetX * direction, y });
  const anchors: Record<string, Point> = {
    heelTop: point(-9, ankle.y - 4),
    upper: point(10, ankle.y - 3),
    toeTop: point(34, ankle.y + 8),
    toe: point(40, ankle.y + 16),
    soleToe: point(38, AVATAR_BOTTOM),
    soleHeel: point(-12, AVATAR_BOTTOM),
    heel: point(-13, ankle.y + 9),
    center: point(13, ankle.y + 10),
  };
  const a = anchors;
  const boundary = right
    ? [a.heelTop, a.upper, a.toeTop, a.toe, a.soleToe, a.soleHeel, a.heel]
    : [a.heelTop, a.heel, a.soleHeel, a.soleToe, a.toe, a.toeTop, a.upper];
  const path = `M ${boundary.map((entry) => `${entry.x} ${entry.y}`).join(" L ")} Z`;
  const xs = boundary.map(({ x }) => x);
  const ys = boundary.map(({ y }) => y);
  return {
    slot: "shoe",
    fitProfile,
    path,
    bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
    seamPaths: [`M ${a.soleHeel.x} ${AVATAR_BOTTOM - 4} L ${a.soleToe.x} ${AVATAR_BOTTOM - 4}`],
    anchors,
  };
}

export function garmentGeometry(item: WardrobeItem, weight: number): GarmentGeometry {
  const body = bodyLandmarks(weight);
  if (item.category === "top") return topGeometry(item, body);
  if (item.category === "bottom") return bottomGeometry(item, body);
  return shoeGeometry(item, body);
}

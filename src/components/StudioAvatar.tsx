import { useId, useState, type DragEvent } from "react";
import { getItem } from "@/lib/data";
import { AVATAR_BOTTOM, AVATAR_HEIGHT, AVATAR_TOP, bodyLandmarks, garmentGeometry, shoeGeometry, type BodyLandmarks, type GarmentGeometry } from "@/lib/studioGeometry";
import { garmentMesh, matrixToSvg } from "@/lib/studioMesh";
import type { OutfitSlot, StudioDraft, WardrobeItem } from "@/lib/types";

interface StudioAvatarProps {
  draft: StudioDraft;
  onWear: (slot: OutfitSlot, itemId: string) => void;
}

function expandedTrianglePoints(points: readonly { x: number; y: number }[], amount = 0.9) {
  const center = points.reduce((sum, point) => ({ x: sum.x + point.x / 3, y: sum.y + point.y / 3 }), { x: 0, y: 0 });
  return points.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.hypot(dx, dy) || 1;
    return `${point.x + (dx / distance) * amount},${point.y + (dy / distance) * amount}`;
  }).join(" ");
}

function Mannequin({ body }: { body: BodyLandmarks }) {
  const leftShoulder = body.shoulderLeft.x;
  const rightShoulder = body.shoulderRight.x;
  const leftHip = body.hipLeft.x;
  const rightHip = body.hipRight.x;
  return (
    <g fill="#d8d1c7" stroke="#aaa196" strokeWidth="1.15" strokeLinejoin="round" data-landmarks="head neck shoulders chest waist hips crotch knees ankles feet">
      <ellipse cx="160" cy={(body.headTop.y + body.headBottom.y) / 2} rx="25" ry={(body.headBottom.y - body.headTop.y) / 2} />
      <path d={`M ${body.neckLeft.x} ${body.headBottom.y - 2} L ${body.neckLeft.x} ${body.neckLeft.y} C ${body.neckLeft.x - 7} 125 ${leftShoulder + 10} 132 ${leftShoulder} ${body.shoulderLeft.y} C ${body.chestLeft.x - 5} 163 ${body.chestLeft.x} ${body.chestLeft.y} ${body.waistLeft.x} ${body.waistLeft.y} C ${body.waistLeft.x} 248 ${leftHip} 258 ${leftHip} ${body.hipLeft.y} C 138 286 147 293 ${body.crotch.x} ${body.crotch.y} C 173 293 182 286 ${rightHip} ${body.hipRight.y} C ${rightHip} 258 ${body.waistRight.x} 248 ${body.waistRight.x} ${body.waistRight.y} C ${body.chestRight.x} ${body.chestRight.y} ${body.chestRight.x + 5} 163 ${rightShoulder} ${body.shoulderRight.y} C ${rightShoulder - 10} 132 ${body.neckRight.x + 7} 125 ${body.neckRight.x} ${body.neckRight.y} L ${body.neckRight.x} ${body.headBottom.y - 2} Z`} />
      <path d={`M ${leftShoulder + 4} 139 C ${leftShoulder - 18} 153 ${leftShoulder - 21} 184 ${leftShoulder - 19} 213 C ${leftShoulder - 20} 241 ${leftShoulder - 24} 276 ${leftShoulder - 25} 306 C ${leftShoulder - 22} 317 ${leftShoulder - 10} 318 ${leftShoulder - 5} 307 C ${leftShoulder - 3} 278 ${leftShoulder + 2} 246 ${leftShoulder + 5} 217 C ${leftShoulder + 11} 187 ${leftShoulder + 14} 163 ${leftShoulder + 4} 139 Z`} />
      <path d={`M ${rightShoulder - 4} 139 C ${rightShoulder + 18} 153 ${rightShoulder + 21} 184 ${rightShoulder + 19} 213 C ${rightShoulder + 20} 241 ${rightShoulder + 24} 276 ${rightShoulder + 25} 306 C ${rightShoulder + 22} 317 ${rightShoulder + 10} 318 ${rightShoulder + 5} 307 C ${rightShoulder + 3} 278 ${rightShoulder - 2} 246 ${rightShoulder - 5} 217 C ${rightShoulder - 11} 187 ${rightShoulder - 14} 163 ${rightShoulder - 4} 139 Z`} />
      <path d={`M ${leftHip + 3} 268 C ${160 - body.thighHalf - 10} 294 ${160 - body.thighHalf - 7} 340 ${160 - body.thighHalf - 4} 374 C ${160 - body.thighHalf - 5} 406 ${body.ankleLeft.x - 2} 468 ${body.ankleLeft.x + 2} ${body.ankleLeft.y} L 159 ${body.ankleLeft.y} C 160 474 162 425 160 389 C 159 350 158 311 160 283 C 148 279 139 274 ${leftHip + 3} 268 Z`} />
      <path d={`M ${rightHip - 3} 268 C ${160 + body.thighHalf + 10} 294 ${160 + body.thighHalf + 7} 340 ${160 + body.thighHalf + 4} 374 C ${160 + body.thighHalf + 5} 406 ${body.ankleRight.x + 2} 468 ${body.ankleRight.x - 2} ${body.ankleRight.y} L 161 ${body.ankleRight.y} C 160 474 158 425 160 389 C 161 350 162 311 160 283 C 172 279 181 274 ${rightHip - 3} 268 Z`} />
      <path d={`M ${body.ankleLeft.x + 2} 515 C 138 520 126 525 ${body.leftFoot.x - 6} 534 C 128 540 147 540 159 535 L 159 518 Z`} />
      <path d={`M ${body.ankleRight.x - 2} 515 C 182 520 194 525 ${body.rightFoot.x + 6} 534 C 192 540 173 540 161 535 L 161 518 Z`} />
    </g>
  );
}

function MeshTexture({ item, geometry, clipId }: { item: WardrobeItem; geometry: GarmentGeometry; clipId: string }) {
  const texture = item.tryOn?.textureAsset;
  const sourcePath = item.tryOn?.sourcePath;
  if (!texture || !sourcePath) return null;
  const mesh = garmentMesh(item, geometry);
  return (
    <>
      <defs>
        <clipPath id={`${clipId}-outer`}><path d={geometry.path} /></clipPath>
        <clipPath id={`${clipId}-source`}><path d={sourcePath} /></clipPath>
        {mesh.map((triangle, index) => (
          <clipPath key={index} id={`${clipId}-triangle-${index}`}>
            <polygon points={expandedTrianglePoints(triangle.target)} />
          </clipPath>
        ))}
      </defs>
      <g clipPath={`url(#${clipId}-outer)`} data-mesh-regions={mesh.length}>
        {mesh.map((triangle, index) => (
          <g key={index} clipPath={`url(#${clipId}-triangle-${index})`} data-mesh-region={triangle.names.join("/")} data-affine-matrix={matrixToSvg(triangle.matrix)}>
            <g transform={matrixToSvg(triangle.matrix)} clipPath={`url(#${clipId}-source)`}>
              <image href={texture} width="1200" height="1500" preserveAspectRatio="none" data-studio-texture={texture} />
            </g>
          </g>
        ))}
      </g>
    </>
  );
}

function GarmentShape({ item, geometry, clipId, annotate = true }: { item: WardrobeItem; geometry: GarmentGeometry; clipId: string; annotate?: boolean }) {
  const calibrated = Boolean(item.tryOn?.textureAsset && item.tryOn.sourcePath && item.tryOn.anchors);
  const stroke = calibrated ? item.color.hex : item.color.tone === "light" ? "#aaa49a" : "rgba(255,255,255,.28)";
  return (
    <g data-preview-mode={annotate ? (calibrated ? "asset" : "fallback") : undefined} data-item-id={annotate ? item.id : undefined} data-fit-profile={annotate ? geometry.fitProfile : undefined}>
      <path d={geometry.path} fill={item.color.hex} opacity={calibrated ? 0.18 : 1} stroke={stroke} strokeWidth="1.35" />
      {calibrated && <MeshTexture item={item} geometry={geometry} clipId={clipId} />}
      {calibrated && <path d={geometry.path} fill={item.color.hex} opacity="0.08" />}
      <path d={geometry.path} fill="none" stroke={stroke} strokeWidth={calibrated ? "1.7" : "1.25"} />
      {geometry.seamPaths.map((path, index) => <path key={index} d={path} fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.75" />)}
    </g>
  );
}

function GarmentLayer({ item, weight }: { item: WardrobeItem; weight: number }) {
  const uid = useId().replaceAll(":", "");
  if (item.category === "shoe") {
    const body = bodyLandmarks(weight);
    const leftGeometry = shoeGeometry(item, body, "left");
    const rightGeometry = shoeGeometry(item, body, "right");
    const calibrated = Boolean(item.tryOn?.textureAsset && item.tryOn.sourcePath && item.tryOn.anchors);
    return (
      <g data-preview-mode={calibrated ? "asset" : "fallback"} data-item-id={item.id} data-fit-profile={rightGeometry.fitProfile}>
        <GarmentShape item={item} geometry={leftGeometry} clipId={`shoe-${uid}-left`} annotate={false} />
        <GarmentShape item={item} geometry={rightGeometry} clipId={`shoe-${uid}-right`} annotate={false} />
      </g>
    );
  }
  const geometry = garmentGeometry(item, weight);
  return <GarmentShape item={item} geometry={geometry} clipId={`${geometry.slot}-${uid}`} />;
}

export function StudioAvatar({ draft, onWear }: StudioAvatarProps) {
  const [dragging, setDragging] = useState(false);
  const body = bodyLandmarks(draft.weight);
  const items = [draft.bottomId, draft.topId, draft.shoeId].map((id) => (id ? getItem(id) : undefined)).filter((item): item is WardrobeItem => Boolean(item));

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const item = getItem(event.dataTransfer.getData("text/wardrobe-item"));
    if (item && (item.category === "top" || item.category === "bottom" || item.category === "shoe")) onWear(item.category, item.id);
  };

  return (
    <div
      className={`relative mx-auto w-full max-w-[390px] rounded-card border bg-studio transition-colors ${dragging ? "border-ink" : "hairline"}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
      onDrop={drop}
      data-testid="studio-drop-zone"
    >
      <div className="absolute left-3 top-3 z-10 label-caps">168 cm</div>
      {dragging && <div className="absolute inset-3 z-20 grid place-items-center border border-dashed border-ink bg-paper/85 label-caps">Release to wear</div>}
      <svg viewBox="0 0 320 600" role="img" aria-label={`Male fitting avatar at 168 centimetres and ${draft.weight} kilograms`} className="block h-[min(65vh,590px)] min-h-[440px] w-full" data-avatar-height={AVATAR_HEIGHT} data-weight={draft.weight}>
        <line x1="36" y1={AVATAR_TOP} x2="36" y2={AVATAR_BOTTOM} stroke="#c9c3b6" strokeWidth="1" />
        <line x1="29" y1={AVATAR_TOP} x2="43" y2={AVATAR_TOP} stroke="#c9c3b6" />
        <line x1="29" y1={AVATAR_BOTTOM} x2="43" y2={AVATAR_BOTTOM} stroke="#c9c3b6" />
        <Mannequin body={body} />
        {items.map((item) => <GarmentLayer key={item.id} item={item} weight={draft.weight} />)}
      </svg>
      <p className="absolute bottom-3 inset-x-3 text-center text-[11px] text-ink-faint">
        {items.length === 0 ? "Select a top, bottom and shoe" : items.some((item) => !item.tryOn?.textureAsset) ? "Schematic preview · calibrated try-on image unavailable" : "Calibrated garment preview"}
      </p>
    </div>
  );
}

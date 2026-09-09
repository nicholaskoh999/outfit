import { useState, type DragEvent } from "react";
import { getItem } from "@/lib/data";
import type { OutfitSlot, StudioDraft, WardrobeItem } from "@/lib/types";

interface StudioAvatarProps {
  draft: StudioDraft;
  onWear: (slot: OutfitSlot, itemId: string) => void;
}

function fallbackGarment(item: WardrobeItem, weightFactor: number) {
  const color = item.color.hex;
  const stroke = item.color.tone === "light" ? "#bcb7ae" : "rgba(255,255,255,.2)";
  if (item.category === "top") {
    const half = 57 + weightFactor * 18;
    return (
      <path
        d={`M ${160 - half} 150 L 118 133 Q 160 147 202 133 L ${160 + half} 150 L ${210 + weightFactor * 12} 250 Q 160 264 ${110 - weightFactor * 12} 250 Z`}
        fill={color} stroke={stroke} strokeWidth="1.5"
      />
    );
  }
  if (item.category === "bottom") {
    const hip = 48 + weightFactor * 16;
    const shorts = item.type.includes("short");
    const hem = shorts ? 350 : 510;
    const inner = shorts ? 344 : 505;
    return (
      <path
        d={`M ${160 - hip} 246 Q 160 255 ${160 + hip} 246 L ${196 + weightFactor * 8} ${hem} L 166 ${hem} L 160 ${inner} L 154 ${hem} L ${124 - weightFactor * 8} ${hem} Z`}
        fill={color} stroke={stroke} strokeWidth="1.5"
      />
    );
  }
  return (
    <g fill={color} stroke={stroke} strokeWidth="1.5">
      <path d="M104 510 Q128 508 151 526 L151 543 L88 543 Q84 526 104 510Z" />
      <path d="M216 510 Q192 508 169 526 L169 543 L232 543 Q236 526 216 510Z" />
    </g>
  );
}

function GarmentLayer({ item, weightFactor }: { item: WardrobeItem; weightFactor: number }) {
  const [failed, setFailed] = useState(false);
  const meta = item.tryOn;
  if (meta?.asset && !failed) {
    if (meta.slot === "shoe") {
      const width = 118 * (meta.scale ?? 1);
      const height = 94 * (meta.scale ?? 1);
      const x = 148 + (meta.x ?? 0);
      const y = 485 + (meta.y ?? 0);
      return (
        <g data-preview-mode="asset" data-item-id={item.id}>
          <foreignObject x={x} y={y} width={width} height={height}>
            <object data={meta.asset} type="image/svg+xml" className="h-full w-full" onError={() => setFailed(true)} aria-label="" />
          </foreignObject>
          <foreignObject x={x} y={y} width={width} height={height} transform="translate(320 0) scale(-1 1)">
            <object data={meta.asset} type="image/svg+xml" className="h-full w-full" onError={() => setFailed(true)} aria-label="" />
          </foreignObject>
        </g>
      );
    }
    const scale = (meta.scale ?? 1) * (0.96 + weightFactor * 0.08);
    return (
      <g
        data-preview-mode="asset"
        data-item-id={item.id}
        transform={`translate(${meta.x ?? 0} ${meta.y ?? 0}) translate(160 300) scale(${scale}) translate(-160 -300)`}
      >
        <foreignObject x="0" y="0" width="320" height="600">
          <object data={meta.asset} type="image/svg+xml" className="h-full w-full" onError={() => setFailed(true)} aria-label="" />
        </foreignObject>
      </g>
    );
  }
  return <g data-preview-mode="fallback" data-item-id={item.id}>{fallbackGarment(item, weightFactor)}</g>;
}

export function StudioAvatar({ draft, onWear }: StudioAvatarProps) {
  const [dragging, setDragging] = useState(false);
  const weightFactor = (draft.weight - 55) / 35;
  const shoulder = 52 + weightFactor * 10;
  const chest = 43 + weightFactor * 13;
  const waist = 31 + weightFactor * 18;
  const hip = 36 + weightFactor * 14;
  const thigh = 18 + weightFactor * 8;
  const items = [draft.bottomId, draft.topId, draft.shoeId]
    .map((id) => (id ? getItem(id) : undefined))
    .filter((item): item is WardrobeItem => Boolean(item));

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const item = getItem(event.dataTransfer.getData("text/wardrobe-item"));
    if (item && (item.category === "top" || item.category === "bottom" || item.category === "shoe")) {
      onWear(item.category, item.id);
    }
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
      {dragging && (
        <div className="absolute inset-3 z-20 grid place-items-center border border-dashed border-ink bg-paper/85 label-caps">
          Release to wear
        </div>
      )}
      <svg viewBox="0 0 320 600" role="img" aria-label={`Male fitting avatar at 168 centimetres and ${draft.weight} kilograms`} className="block h-[min(65vh,590px)] min-h-[440px] w-full">
        <line x1="36" y1="52" x2="36" y2="544" stroke="#c9c3b6" strokeWidth="1" />
        <line x1="29" y1="52" x2="43" y2="52" stroke="#c9c3b6" />
        <line x1="29" y1="544" x2="43" y2="544" stroke="#c9c3b6" />

        <g fill="#d8d1c7" stroke="#aaa196" strokeWidth="1.15" strokeLinejoin="round">
          <ellipse cx="160" cy="76" rx="25" ry="31" />
          <path d={`M147 100 C148 113 145 120 ${160 - 24} 127 C ${160 - 35} 131 ${160 - shoulder + 9} 134 ${160 - shoulder} 143 C ${160 - chest - 5} 164 ${160 - chest} 184 ${160 - waist} 230 C ${160 - waist + 1} 246 ${160 - hip} 258 ${160 - hip} 274 C ${160 - 22} 283 182 283 ${160 + hip} 274 C ${160 + hip} 258 ${160 + waist - 1} 246 ${160 + waist} 230 C ${160 + chest} 184 ${160 + chest + 5} 164 ${160 + shoulder} 143 C ${160 + shoulder - 9} 134 195 131 184 127 C175 120 172 113 173 100 Z`} />
          <path d={`M ${160 - shoulder + 4} 140 C ${160 - shoulder - 18} 151 ${160 - shoulder - 21} 181 ${160 - shoulder - 19} 209 C ${160 - shoulder - 20} 235 ${160 - shoulder - 24} 272 ${160 - shoulder - 25} 304 C ${160 - shoulder - 22} 315 ${160 - shoulder - 10} 316 ${160 - shoulder - 5} 306 C ${160 - shoulder - 3} 277 ${160 - shoulder + 2} 244 ${160 - shoulder + 5} 216 C ${160 - shoulder + 11} 187 ${160 - shoulder + 14} 164 ${160 - shoulder + 4} 140 Z`} />
          <path d={`M ${160 + shoulder - 4} 140 C ${160 + shoulder + 18} 151 ${160 + shoulder + 21} 181 ${160 + shoulder + 19} 209 C ${160 + shoulder + 20} 235 ${160 + shoulder + 24} 272 ${160 + shoulder + 25} 304 C ${160 + shoulder + 22} 315 ${160 + shoulder + 10} 316 ${160 + shoulder + 5} 306 C ${160 + shoulder + 3} 277 ${160 + shoulder - 2} 244 ${160 + shoulder - 5} 216 C ${160 + shoulder - 11} 187 ${160 + shoulder - 14} 164 ${160 + shoulder - 4} 140 Z`} />
          <path d={`M ${160 - hip + 3} 268 C ${160 - thigh - 10} 292 ${160 - thigh - 7} 337 ${160 - thigh - 4} 373 C ${160 - thigh - 5} 405 ${145 - weightFactor * 2} 465 147 519 L159 519 C160 475 162 424 160 389 C159 348 158 309 160 283 C148 279 139 274 ${160 - hip + 3} 268 Z`} />
          <path d={`M ${160 + hip - 3} 268 C ${160 + thigh + 10} 292 ${160 + thigh + 7} 337 ${160 + thigh + 4} 373 C ${160 + thigh + 5} 405 ${175 + weightFactor * 2} 465 173 519 L161 519 C160 475 158 424 160 389 C161 348 162 309 160 283 C172 279 181 274 ${160 + hip - 3} 268 Z`} />
          <path d="M147 515 C138 520 126 524 120 533 C128 538 146 539 159 534 L159 518 Z" />
          <path d="M173 515 C182 520 194 524 200 533 C192 538 174 539 161 534 L161 518 Z" />
        </g>
        {items.map((item) => <GarmentLayer key={item.id} item={item} weightFactor={weightFactor} />)}
      </svg>
      <p className="absolute bottom-3 inset-x-3 text-center text-[11px] text-ink-faint">
        {items.length === 0
          ? "Select a top, bottom and shoe"
          : items.some((item) => !item.tryOn?.asset)
            ? "Schematic preview · calibrated try-on image unavailable"
            : "Calibrated garment preview"}
      </p>
    </div>
  );
}

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
    const width = 320 * (meta.scale ?? 1);
    return (
      <image
        href={meta.asset}
        x={(320 - width) / 2 + (meta.x ?? 0)}
        y={meta.y ?? 0}
        width={width}
        height="600"
        preserveAspectRatio="xMidYMid meet"
        onError={() => setFailed(true)}
      />
    );
  }
  return fallbackGarment(item, weightFactor);
}

export function StudioAvatar({ draft, onWear }: StudioAvatarProps) {
  const [dragging, setDragging] = useState(false);
  const weightFactor = (draft.weight - 55) / 35;
  const shoulder = 48 + weightFactor * 13;
  const waist = 31 + weightFactor * 23;
  const hip = 35 + weightFactor * 19;
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

        <g fill="#d4b39c" stroke="#ad8f7c" strokeWidth="1.2">
          <ellipse cx="160" cy="82" rx="31" ry="37" />
          <path d={`M142 112 L178 112 L ${160 + shoulder} 151 Q ${160 + waist} 198 ${160 + hip} 248 Q 160 ${260 + weightFactor * 5} ${160 - hip} 248 Q ${160 - waist} 198 ${160 - shoulder} 151 Z`} />
          <path d={`M ${160 - shoulder + 5} 151 Q 92 188 88 290 L106 293 Q 117 215 ${160 - waist} 196 Z`} />
          <path d={`M ${160 + shoulder - 5} 151 Q 228 188 232 290 L214 293 Q 203 215 ${160 + waist} 196 Z`} />
          <path d={`M ${160 - hip} 242 Q ${143 - weightFactor * 3} 253 158 248 L ${158 - weightFactor * 2} 364 L ${154 - weightFactor * 2} 511 L ${136 - weightFactor * 4} 511 L ${126 - weightFactor * 7} 365 Z`} />
          <path d={`M ${160 + hip} 242 Q ${177 + weightFactor * 3} 253 162 248 L ${162 + weightFactor * 2} 364 L ${166 + weightFactor * 2} 511 L ${184 + weightFactor * 4} 511 L ${194 + weightFactor * 7} 365 Z`} />
          <path d="M140 505 L139 535 Q116 542 93 537 Q91 527 111 516Z" />
          <path d="M180 505 L181 535 Q204 542 227 537 Q229 527 209 516Z" />
        </g>
        <path d="M132 72 Q134 38 160 39 Q190 41 190 76 Q176 61 137 66Z" fill="#38332e" />
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

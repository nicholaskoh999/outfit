import { useMemo, useState, type DragEvent } from "react";
import { getItem, itemsOf, parseComboKey } from "@/lib/data";
import { effectiveStatus } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import type { OutfitSlot, WardrobeItem } from "@/lib/types";
import { ItemImage } from "@/components/ItemImage";
import { StudioAvatar } from "@/components/StudioAvatar";

const SLOTS: { slot: OutfitSlot; label: string }[] = [
  { slot: "top", label: "Tops" },
  { slot: "bottom", label: "Bottoms" },
  { slot: "shoe", label: "Shoes" },
];

function PieceButton({ item, selected, onWear }: { item: WardrobeItem; selected: boolean; onWear: () => void }) {
  const startDrag = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("text/wardrobe-item", item.id);
    event.dataTransfer.effectAllowed = "copy";
  };
  return (
    <button
      type="button"
      draggable
      onDragStart={startDrag}
      onClick={onWear}
      className={`group min-w-0 text-left rounded-card border p-2 transition-colors cursor-pointer ${selected ? "border-ink bg-paper-deep" : "hairline hover:border-line-strong"}`}
      aria-pressed={selected}
      aria-label={`Wear ${item.name}`}
    >
      <div className="aspect-[4/5] overflow-hidden bg-studio">
        <ItemImage item={item} inset className="transition-transform duration-300 group-hover:scale-[1.02]" />
      </div>
      <p className="mt-2 truncate text-[12px] leading-snug">{item.name}</p>
      <p className="truncate text-[11px] text-ink-faint">{item.color.name}</p>
    </button>
  );
}

export function StudioPage() {
  const { user, setStudioWeight, setStudioSlot, saveStudioLook, loadStudioLook } = useStore();
  const [slot, setSlot] = useState<OutfitSlot>("top");
  const [saveNote, setSaveNote] = useState("");
  const draft = user.studio;
  const selectedId = draft[`${slot}Id` as "topId" | "bottomId" | "shoeId"];
  const pieces = useMemo(
    () => itemsOf(slot).filter((item) => effectiveStatus(item, user) === "active"),
    [slot, user],
  );
  const complete = Boolean(draft.topId && draft.bottomId && draft.shoeId);

  const wear = (nextSlot: OutfitSlot, id: string) => {
    setStudioSlot(nextSlot, id);
    setSlot(nextSlot);
    setSaveNote("");
  };

  const save = () => {
    const key = complete ? `${draft.topId}_${draft.bottomId}_${draft.shoeId}` : "";
    const alreadySaved = draft.savedLooks.includes(key);
    saveStudioLook();
    setSaveNote(alreadySaved ? "Already saved" : "Look saved");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pb-12">
      <div className="pt-8 sm:pt-12 pb-6 flex items-end justify-between gap-6">
        <div>
          <p className="label-caps mb-2">Personal fitting</p>
          <h1 className="display text-3xl sm:text-4xl">Studio</h1>
        </div>
        <p className="hidden sm:block max-w-xs text-right text-[13px] leading-relaxed text-ink-faint">
          Tap a piece to wear it, or drag it onto the figure.
        </p>
      </div>

      <div className="grid gap-7 lg:grid-cols-[210px_minmax(300px,1fr)_370px] lg:items-start">
        <aside className="order-2 lg:order-1 border-y hairline py-5 lg:border lg:p-5 rounded-card">
          <div className="flex items-baseline justify-between">
            <label htmlFor="studio-weight" className="label-caps">Body weight</label>
            <output htmlFor="studio-weight" className="display text-2xl">{draft.weight} kg</output>
          </div>
          <input
            id="studio-weight"
            type="range"
            min="55"
            max="90"
            step="1"
            value={draft.weight}
            onChange={(event) => setStudioWeight(Number(event.target.value))}
            className="mt-4 w-full accent-ink"
            aria-label="Body weight in kilograms"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-faint"><span>55</span><span>90 kg</span></div>
          <p className="mt-5 text-[12px] leading-relaxed text-ink-faint">
            Height stays fixed at 168 cm. Weight adjusts torso, waist, hip and thigh proportions.
          </p>

          <div className="mt-7 border-t hairline pt-5">
            <div className="flex items-center justify-between">
              <span className="label-caps">Saved looks</span>
              <span className="text-[11px] text-ink-faint">{draft.savedLooks.length}</span>
            </div>
            {draft.savedLooks.length === 0 ? (
              <p className="mt-3 text-[12px] text-ink-faint">Complete all three slots to save a look.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {draft.savedLooks.map((key, index) => {
                  const combo = parseComboKey(key);
                  const names = combo ? [getItem(combo.top), getItem(combo.bottom), getItem(combo.shoe)].map((item) => item?.name).join(" · ") : key;
                  return (
                    <button key={key} onClick={() => loadStudioLook(key)} className="block w-full text-left text-[12px] leading-snug hover:underline underline-offset-4 cursor-pointer">
                      <span className="text-ink-faint">{String(index + 1).padStart(2, "0")}</span> {names}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="order-1 lg:order-2">
          <StudioAvatar draft={draft} onWear={wear} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {SLOTS.map(({ slot: slotName, label }) => {
              const id = draft[`${slotName}Id` as "topId" | "bottomId" | "shoeId"];
              return (
                <button key={slotName} onClick={() => setSlot(slotName)} className={`min-w-0 border-b py-2 text-left cursor-pointer ${slot === slotName ? "border-ink" : "hairline"}`}>
                  <span className="label-caps">{label}</span>
                  <span className="mt-1 block truncate text-[12px]">{id ? getItem(id)?.name : "Not selected"}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={save}
            disabled={!complete}
            className="mt-4 w-full rounded-card bg-ink px-5 py-3.5 text-[11px] uppercase tracking-[0.16em] text-paper transition-opacity enabled:cursor-pointer disabled:opacity-30"
          >
            Save Studio look
          </button>
          <p role="status" className="mt-2 min-h-4 text-center text-[11px] text-ink-faint">{saveNote}</p>
        </section>

        <section className="order-3 min-w-0">
          <p className="sm:hidden mb-4 text-[13px] leading-relaxed text-ink-faint">Tap a piece to wear it.</p>
          <div className="flex gap-5 border-b hairline overflow-x-auto no-scrollbar">
            {SLOTS.map(({ slot: value, label }) => (
              <button key={value} onClick={() => setSlot(value)} className={`shrink-0 pb-3 -mb-px border-b text-[12px] uppercase tracking-[0.14em] cursor-pointer ${slot === value ? "border-ink text-ink" : "border-transparent text-ink-faint"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 max-h-none lg:max-h-[650px] lg:overflow-y-auto lg:pr-2">
            {pieces.map((item) => (
              <PieceButton key={item.id} item={item} selected={selectedId === item.id} onWear={() => wear(slot, item.id)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

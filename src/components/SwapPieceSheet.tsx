import { Sheet } from "./ui/Sheet";
import { swapAlternatives } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import { getItem } from "@/lib/data";
import { formatScore } from "@/lib/format";
import { ItemImage } from "./ItemImage";
import type { Category, OutfitCombo, RecommendationContext } from "@/lib/types";

interface SwapPieceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  combo: OutfitCombo;
  slot: Category | null;
  ctx: RecommendationContext;
  onSwap: (newCombo: OutfitCombo) => void;
}

const SLOT_LABEL: Record<Category, string> = { top: "Top", bottom: "Bottom", shoe: "Shoes" };

/**
 * Swapping one piece recomputes the resulting outfit's score in place —
 * it never restarts the recommendation flow.
 */
export function SwapPieceSheet({ open, onOpenChange, combo, slot, ctx, onSwap }: SwapPieceSheetProps) {
  const { user } = useStore();
  if (!slot) return null;

  const alternatives = swapAlternatives(combo, slot, ctx, user);
  const currentId = slot === "top" ? combo.top : slot === "bottom" ? combo.bottom : combo.shoe;
  const current = getItem(currentId);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Swap ${SLOT_LABEL[slot]}`}
      description={`Choose a different ${SLOT_LABEL[slot].toLowerCase()} — the outfit score updates for each option`}
    >
      {current && (
        <p className="text-[12px] font-light text-ink-faint mb-5">
          Currently: {current.name} — {current.color.name}
        </p>
      )}
      {alternatives.length === 0 ? (
        <p className="text-sm font-light text-ink-soft">
          No other {SLOT_LABEL[slot].toLowerCase()} is available right now.
        </p>
      ) : (
        <ul className="space-y-1">
          {alternatives.map((alt) => {
            const altId =
              slot === "top" ? alt.combo.top : slot === "bottom" ? alt.combo.bottom : alt.combo.shoe;
            const item = getItem(altId)!;
            return (
              <li key={alt.key}>
                <button
                  onClick={() => {
                    onSwap(alt.combo);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center gap-4 py-3 border-b hairline last:border-0 text-left group cursor-pointer"
                >
                  <div className="w-14 h-[4.375rem] shrink-0 overflow-hidden rounded-card">
                    <ItemImage item={item} inset />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light truncate group-hover:underline underline-offset-4">
                      {item.name}
                    </p>
                    <p className="text-[12px] text-ink-faint font-light">
                      {item.color.name}
                      {item.placeholder ? " · placeholder" : ""}
                    </p>
                  </div>
                  <span className="display text-lg tabular-nums">
                    {formatScore(alt.breakdown.total)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

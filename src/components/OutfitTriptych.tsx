import { comboItems } from "@/lib/data";
import type { OutfitCombo } from "@/lib/types";
import { ItemImage } from "./ItemImage";

/**
 * The visual identity of an outfit: top garment large,
 * bottom + shoes beneath. Always 4:5 overall.
 */
export function OutfitTriptych({ combo, className = "" }: { combo: OutfitCombo; className?: string }) {
  const [top, bottom, shoe] = comboItems(combo);
  return (
    <div className={`aspect-[4/5] grid grid-rows-[3fr_2fr] gap-px bg-line overflow-hidden rounded-card ${className}`}>
      <div className="overflow-hidden bg-paper-deep">
        <ItemImage item={top} />
      </div>
      <div className="grid grid-cols-2 gap-px">
        <div className="overflow-hidden bg-paper-deep">
          <ItemImage item={bottom} inset />
        </div>
        <div className="overflow-hidden bg-paper-deep">
          <ItemImage item={shoe} inset />
        </div>
      </div>
    </div>
  );
}

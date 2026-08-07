import type { ColorFamily, Fit, ItemStatus, Occasion } from "@/lib/types";
import { OCCASIONS } from "@/lib/context";

export interface WardrobeFilterState {
  color: ColorFamily | null;
  occasion: Occasion | null;
  status: ItemStatus | null;
  fit: Fit | null;
  favoritesOnly: boolean;
}

export const EMPTY_FILTERS: WardrobeFilterState = {
  color: null,
  occasion: null,
  status: null,
  fit: null,
  favoritesOnly: false,
};

export function countActiveFilters(f: WardrobeFilterState): number {
  return [f.color, f.occasion, f.status, f.fit].filter(Boolean).length + (f.favoritesOnly ? 1 : 0);
}

const COLOR_OPTIONS: { value: ColorFamily; label: string }[] = [
  { value: "black", label: "Black" },
  { value: "charcoal", label: "Charcoal" },
  { value: "grey", label: "Grey" },
  { value: "white", label: "White" },
  { value: "beige", label: "Beige" },
  { value: "baby-blue", label: "Baby Blue" },
  { value: "greenish-blue", label: "Greenish Blue" },
  { value: "apricot", label: "Apricot" },
];

const FIT_OPTIONS: Fit[] = ["slim", "regular", "loose", "oversized"];
const STATUS_OPTIONS: ItemStatus[] = ["active", "laundry", "unavailable", "retired", "wishlist"];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] border rounded-full transition-all duration-300 cursor-pointer ${
        active
          ? "bg-ink text-paper border-ink"
          : "border-line-strong text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

interface WardrobeFiltersProps {
  filters: WardrobeFilterState;
  onChange: (next: WardrobeFilterState) => void;
}

export function WardrobeFilters({ filters, onChange }: WardrobeFiltersProps) {
  const set = <K extends keyof WardrobeFilterState>(key: K, value: WardrobeFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-6">
      <div>
        <p className="label-caps mb-2.5">Color</p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              active={filters.color === c.value}
              onClick={() => set("color", filters.color === c.value ? null : c.value)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="label-caps mb-2.5">Occasion</p>
        <div className="flex flex-wrap gap-1.5">
          {OCCASIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              active={filters.occasion === o.value}
              onClick={() => set("occasion", filters.occasion === o.value ? null : o.value)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="label-caps mb-2.5">Fit</p>
        <div className="flex flex-wrap gap-1.5">
          {FIT_OPTIONS.map((f) => (
            <Chip
              key={f}
              label={f}
              active={filters.fit === f}
              onClick={() => set("fit", filters.fit === f ? null : f)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="label-caps mb-2.5">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={filters.status === s}
              onClick={() => set("status", filters.status === s ? null : s)}
            />
          ))}
        </div>
      </div>
      <div>
        <Chip
          label="Favorites only"
          active={filters.favoritesOnly}
          onClick={() => set("favoritesOnly", !filters.favoritesOnly)}
        />
      </div>
    </div>
  );
}

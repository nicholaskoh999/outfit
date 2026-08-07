import { useMemo, useState } from "react";
import { wardrobe } from "@/lib/data";
import { effectiveStatus } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import { WardrobeCard } from "@/components/WardrobeCard";
import {
  EMPTY_FILTERS,
  WardrobeFilters,
  countActiveFilters,
  type WardrobeFilterState,
} from "@/components/WardrobeFilters";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/EmptyState";
import { useIsDesktop } from "@/lib/useMediaQuery";
import type { Category } from "@/lib/types";

const TABS: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "top", label: "Tops" },
  { value: "bottom", label: "Bottoms" },
  { value: "shoe", label: "Shoes" },
];

export function WardrobePage() {
  const { user } = useStore();
  const [tab, setTab] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<WardrobeFilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wardrobe.filter((item) => {
      if (tab !== "all" && item.category !== tab) return false;
      const status = effectiveStatus(item, user);
      if (q && !`${item.name} ${item.brand} ${item.color.name} ${item.type}`.toLowerCase().includes(q))
        return false;
      if (filters.color && item.color.family !== filters.color) return false;
      if (filters.occasion && !item.occasions.includes(filters.occasion)) return false;
      if (filters.status && status !== filters.status) return false;
      if (filters.fit && item.fit !== filters.fit) return false;
      if (filters.favoritesOnly && !user.favoritePieces.includes(item.id)) return false;
      return true;
    });
  }, [tab, query, filters, user]);

  const activeFilters = countActiveFilters(filters);

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="pt-8 sm:pt-12 pb-6 flex items-end justify-between">
        <h1 className="display text-3xl sm:text-4xl">Wardrobe</h1>
        <span className="label-caps">{items.length} pieces</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-6 border-b hairline mb-5">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`pb-3 -mb-px text-[12px] uppercase tracking-[0.14em] border-b transition-colors cursor-pointer ${
              tab === t.value
                ? "border-ink text-ink"
                : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + filter access */}
      <div className="flex items-center gap-4 mb-7">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pieces…"
          className="flex-1 max-w-xs bg-transparent border-b hairline focus:border-ink outline-none py-2 text-sm font-light placeholder:text-ink-faint transition-colors"
        />
        {/* Mobile: sheet. Desktop: toggle inline panel. */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="label-caps underline underline-offset-4 hover:text-ink transition-colors cursor-pointer"
        >
          Filters{activeFilters > 0 ? ` · ${activeFilters}` : ""}
        </button>
        {activeFilters > 0 && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="label-caps hover:text-ink transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Desktop inline filter panel */}
      {filtersOpen && isDesktop && (
        <div className="border hairline rounded-card p-6 mb-8 animate-fade-in">
          <WardrobeFilters filters={filters} onChange={setFilters} />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Nothing here"
          message="No pieces match this combination of search and filters."
          action={
            <button
              onClick={() => {
                setQuery("");
                setFilters(EMPTY_FILTERS);
              }}
              className="label-caps underline underline-offset-4 cursor-pointer"
            >
              Reset everything
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 pb-16">
          {items.map((item) => (
            <WardrobeCard
              key={item.id}
              item={item}
              status={effectiveStatus(item, user)}
              favorite={user.favoritePieces.includes(item.id)}
            />
          ))}
        </div>
      )}

      {/* Mobile filter sheet */}
      {!isDesktop && (
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters" description="Filter wardrobe pieces">
          <WardrobeFilters filters={filters} onChange={setFilters} />
          <button
            onClick={() => setFiltersOpen(false)}
            className="w-full mt-8 py-3.5 bg-ink text-paper uppercase tracking-[0.16em] text-[11px] rounded-card cursor-pointer"
          >
            Show {items.length} piece{items.length === 1 ? "" : "s"}
          </button>
        </Sheet>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { comboKey, outfitSeeds, parseComboKey } from "@/lib/data";
import { scoreOutfit } from "@/lib/scoring";
import { useStore, wearStatsForCombo } from "@/lib/store";
import { formatScore, outfitNumber, relativeDate } from "@/lib/format";
import { OutfitTriptych } from "@/components/OutfitTriptych";
import { EmptyState } from "@/components/EmptyState";
import type { OutfitCombo } from "@/lib/types";

type OutfitFilter = "all" | "approved" | "suggested" | "favorites" | "worn";

const FILTERS: { value: OutfitFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "suggested", label: "Suggested" },
  { value: "favorites", label: "Favorites" },
  { value: "worn", label: "Worn" },
];

interface OutfitEntry {
  key: string;
  combo: OutfitCombo;
  seedId?: string;
  name?: string;
  state: "approved" | "suggested" | "worn";
  favorite: boolean;
  timesWorn: number;
  lastWorn: string | null;
}

const NEUTRAL_CTX = { occasion: null, refine: { weather: null, style: null, workContext: null } } as const;

export function OutfitsPage() {
  const { user } = useStore();

  // The filter lives in the URL so the wear-history toast can deep-link to it.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("filter");
  const filter: OutfitFilter =
    FILTERS.some((f) => f.value === requested) ? (requested as OutfitFilter) : "all";
  const setFilter = (value: OutfitFilter) =>
    setSearchParams(value === "all" ? {} : { filter: value }, { replace: true });

  const entries = useMemo<OutfitEntry[]>(() => {
    const list: OutfitEntry[] = [];
    const seen = new Set<string>();
    const withWear = (entry: Omit<OutfitEntry, "timesWorn" | "lastWorn">): OutfitEntry => {
      const { timesWorn, lastWorn } = wearStatsForCombo(user, entry.key);
      return { ...entry, timesWorn, lastWorn };
    };

    for (const seed of outfitSeeds) {
      const key = comboKey(seed.items);
      seen.add(key);
      const decision = user.decisions[key];
      if (decision?.verdict === "rejected") continue;
      list.push(
        withWear({
          key,
          combo: seed.items,
          seedId: seed.id,
          name: seed.name,
          state: decision?.verdict === "approved" || seed.status === "approved" ? "approved" : "suggested",
          favorite: user.favoriteLooks.includes(key),
        }),
      );
    }

    // Combinations the user approved that aren't part of the curated seed set.
    for (const [key, decision] of Object.entries(user.decisions)) {
      if (decision.verdict !== "approved" || seen.has(key)) continue;
      seen.add(key);
      const combo = parseComboKey(key);
      if (!combo) continue;
      list.push(withWear({ key, combo, state: "approved", favorite: user.favoriteLooks.includes(key) }));
    }

    // Looks the user actually wore, even if never curated or approved.
    for (const wear of user.wearLog) {
      if (seen.has(wear.key)) continue;
      seen.add(wear.key);
      if (user.decisions[wear.key]?.verdict === "rejected") continue;
      const combo = parseComboKey(wear.key);
      if (!combo) continue;
      list.push(withWear({ key: wear.key, combo, state: "worn", favorite: user.favoriteLooks.includes(wear.key) }));
    }

    return list;
  }, [user]);

  const filtered = entries
    .filter((e) => {
      if (filter === "approved") return e.state === "approved";
      if (filter === "suggested") return e.state === "suggested";
      if (filter === "favorites") return e.favorite;
      if (filter === "worn") return e.timesWorn > 0;
      return true;
    })
    // Most recently worn first, so the tab reads as a history.
    .sort((a, b) => (filter === "worn" ? (b.lastWorn ?? "").localeCompare(a.lastWorn ?? "") : 0));

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="pt-8 sm:pt-12 pb-6 flex items-end justify-between">
        <h1 className="display text-3xl sm:text-4xl">Outfits</h1>
        <span className="label-caps">{filtered.length} looks</span>
      </div>

      {/* Five tabs overflow a phone width, so the row scrolls edge to edge. */}
      <div className="flex gap-6 border-b hairline mb-8 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`pb-3 -mb-px shrink-0 whitespace-nowrap text-[12px] uppercase tracking-[0.14em] border-b transition-colors cursor-pointer ${
              filter === f.value
                ? "border-ink text-ink"
                : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No outfits here"
          message={
            filter === "favorites"
              ? "You haven't favorited any complete looks yet. Tap the heart on an outfit you love."
              : filter === "worn"
                ? "Nothing worn yet. Open a look and tap Wear today to start your history."
                : "Nothing in this state yet — approve or explore looks from the Today page."
          }
          action={
            <Link to="/" className="label-caps underline underline-offset-4">
              Go to Today
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 pb-16">
          {filtered.map((e) => {
            const scored = scoreOutfit(e.combo, NEUTRAL_CTX, user);
            return (
              <Link key={e.key} to={`/outfits/${e.seedId ?? e.key}`} className="group block animate-fade-up">
                <div className="relative">
                  <OutfitTriptych
                    combo={e.combo}
                    className="transition-transform duration-500 group-hover:scale-[1.015]"
                  />
                  {e.favorite && (
                    <span className="absolute top-2.5 right-2.5 text-[13px]">♥</span>
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-light leading-snug truncate">
                      {e.name ??
                        (e.seedId
                          ? outfitNumber(e.seedId)
                          : e.state === "worn"
                            ? "Worn look"
                            : "Approved look")}
                    </p>
                    {filter === "worn" ? (
                      <p className="label-caps mt-0.5">
                        {e.timesWorn}&times; worn
                        {e.lastWorn && <> &middot; last {relativeDate(e.lastWorn)}</>}
                      </p>
                    ) : (
                      <p className="label-caps mt-0.5">{e.state}</p>
                    )}
                  </div>
                  <span className="display text-base">{formatScore(scored.breakdown.total)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

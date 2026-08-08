import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { comboKey, outfitSeeds, parseComboKey } from "@/lib/data";
import { scoreOutfit } from "@/lib/scoring";
import { useStore } from "@/lib/store";
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

const FILTER_VALUES = FILTERS.map((f) => f.value);

interface OutfitEntry {
  key: string;
  combo: OutfitCombo;
  seedId?: string;
  name?: string;
  state: "approved" | "suggested";
  favorite: boolean;
  /** Present only in the Worn view. */
  worn?: { timesWorn: number; lastWorn: string };
}

const NEUTRAL_CTX = { occasion: null, refine: { weather: null, style: null, workContext: null } } as const;

export function OutfitsPage() {
  const { user } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("filter");
  const filter: OutfitFilter = FILTER_VALUES.includes(raw as OutfitFilter)
    ? (raw as OutfitFilter)
    : "all";
  const setFilter = (next: OutfitFilter) =>
    setSearchParams(next === "all" ? {} : { filter: next }, { replace: true });

  // Deep links like /outfits?filter=worn land with the active tab possibly
  // outside the scrollable tab row on narrow screens — bring it into view.
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [filter]);

  const entries = useMemo<OutfitEntry[]>(() => {
    const list: OutfitEntry[] = [];
    const seen = new Set<string>();

    for (const seed of outfitSeeds) {
      const key = comboKey(seed.items);
      seen.add(key);
      const decision = user.decisions[key];
      if (decision?.verdict === "rejected") continue;
      list.push({
        key,
        combo: seed.items,
        seedId: seed.id,
        name: seed.name,
        state: decision?.verdict === "approved" || seed.status === "approved" ? "approved" : "suggested",
        favorite: user.favoriteLooks.includes(key),
      });
    }

    // Combinations the user approved that aren't part of the curated seed set.
    for (const [key, decision] of Object.entries(user.decisions)) {
      if (decision.verdict !== "approved" || seen.has(key)) continue;
      const combo = parseComboKey(key);
      if (!combo) continue;
      list.push({
        key,
        combo,
        state: "approved",
        favorite: user.favoriteLooks.includes(key),
      });
    }

    return list;
  }, [user]);

  /** Every look ever worn — even if never approved or seeded — most recent first. */
  const wornEntries = useMemo<OutfitEntry[]>(() => {
    const byKey = new Map<string, { timesWorn: number; lastWorn: string; combo: OutfitCombo }>();
    for (const e of user.wearLog) {
      const cur = byKey.get(e.key);
      if (cur) {
        cur.timesWorn++;
        if (e.date > cur.lastWorn) cur.lastWorn = e.date;
      } else {
        const combo = parseComboKey(e.key);
        if (combo) byKey.set(e.key, { timesWorn: 1, lastWorn: e.date, combo });
      }
    }
    const known = new Map(entries.map((e) => [e.key, e]));
    return [...byKey.entries()]
      .sort((a, b) => b[1].lastWorn.localeCompare(a[1].lastWorn))
      .map(([key, w]) => {
        const base = known.get(key);
        return {
          key,
          combo: w.combo,
          seedId: base?.seedId,
          name: base?.name,
          state: base?.state ?? "suggested",
          favorite: user.favoriteLooks.includes(key),
          worn: { timesWorn: w.timesWorn, lastWorn: w.lastWorn },
        };
      });
  }, [entries, user]);

  const filtered =
    filter === "worn"
      ? wornEntries
      : entries.filter((e) => {
          if (filter === "approved") return e.state === "approved";
          if (filter === "suggested") return e.state === "suggested";
          if (filter === "favorites") return e.favorite;
          return true;
        });

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="pt-8 sm:pt-12 pb-6 flex items-end justify-between">
        <h1 className="display text-3xl sm:text-4xl">Outfits</h1>
        <span className="label-caps">
          {filtered.length} look{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex gap-5 sm:gap-6 border-b hairline mb-8 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            ref={filter === f.value ? activeTabRef : undefined}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 whitespace-nowrap pb-3 -mb-px text-[12px] uppercase tracking-[0.14em] border-b transition-colors cursor-pointer ${
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
                ? "Nothing worn yet. Tap Wear Today on an outfit and it will show up here."
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
                      {e.name ?? (e.seedId ? outfitNumber(e.seedId) : e.worn ? "Worn look" : "Approved look")}
                    </p>
                    <p className="label-caps mt-0.5">
                      {e.worn
                        ? `Worn ${e.worn.timesWorn}× · ${relativeDate(e.worn.lastWorn)}`
                        : e.state}
                    </p>
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

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { comboKey, outfitSeeds, parseComboKey } from "@/lib/data";
import { scoreOutfit } from "@/lib/scoring";
import { useStore } from "@/lib/store";
import { formatScore, outfitNumber } from "@/lib/format";
import { OutfitTriptych } from "@/components/OutfitTriptych";
import { EmptyState } from "@/components/EmptyState";
import type { OutfitCombo } from "@/lib/types";

type OutfitFilter = "all" | "approved" | "suggested" | "favorites";

const FILTERS: { value: OutfitFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "suggested", label: "Suggested" },
  { value: "favorites", label: "Favorites" },
];

interface OutfitEntry {
  key: string;
  combo: OutfitCombo;
  seedId?: string;
  name?: string;
  state: "approved" | "suggested";
  favorite: boolean;
}

const NEUTRAL_CTX = { occasion: null, refine: { weather: null, style: null, workContext: null } } as const;

export function OutfitsPage() {
  const { user } = useStore();
  const [filter, setFilter] = useState<OutfitFilter>("all");

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

  const filtered = entries.filter((e) => {
    if (filter === "approved") return e.state === "approved";
    if (filter === "suggested") return e.state === "suggested";
    if (filter === "favorites") return e.favorite;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="pt-8 sm:pt-12 pb-6 flex items-end justify-between">
        <h1 className="display text-3xl sm:text-4xl">Outfits</h1>
        <span className="label-caps">{filtered.length} looks</span>
      </div>

      <div className="flex gap-6 border-b hairline mb-8">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`pb-3 -mb-px text-[12px] uppercase tracking-[0.14em] border-b transition-colors cursor-pointer ${
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
                      {e.name ?? (e.seedId ? outfitNumber(e.seedId) : "Approved look")}
                    </p>
                    <p className="label-caps mt-0.5">{e.state}</p>
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

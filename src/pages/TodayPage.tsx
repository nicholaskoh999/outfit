import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { recommend } from "@/lib/recommend";
import { comboItems } from "@/lib/data";
import { formatScore } from "@/lib/format";
import { OCCASIONS, occasionLabel, useRecommendationContext } from "@/lib/context";
import { OutfitTriptych } from "@/components/OutfitTriptych";
import { RecommendationCard } from "@/components/RecommendationCard";
import { RefineSheet } from "@/components/RefineSheet";
import { EmptyState } from "@/components/EmptyState";

export function TodayPage() {
  const { user } = useStore();
  const { ctx, setOccasion, setRefine, search } = useRecommendationContext();
  const [refineOpen, setRefineOpen] = useState(false);

  const activeRefinements = [
    ctx.refine.weather,
    ctx.refine.style,
    ctx.refine.workContext,
  ].filter(Boolean).length;

  // Quick Pick — a single good default before any occasion is chosen.
  const quickPick = useMemo(
    () => recommend({ occasion: null, refine: ctx.refine }, user).results[0]?.outfit ?? null,
    [user, ctx.refine],
  );

  const recs = useMemo(
    () => (ctx.occasion ? recommend(ctx, user) : null),
    [ctx, user],
  );

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      {/* Question header */}
      <section className="pt-8 sm:pt-14 pb-6">
        <p className="label-caps mb-2">{today}</p>
        <h1 className="display text-[2rem] sm:text-5xl leading-[1.08]">
          What are you doing{" "}
          <em className="italic">today?</em>
        </h1>
      </section>

      {/* Occasion selection */}
      <section className="flex flex-wrap gap-2 pb-2">
        {OCCASIONS.map((o) => {
          const active = ctx.occasion === o.value;
          return (
            <button
              key={o.value}
              onClick={() => setOccasion(active ? null : o.value)}
              className={`px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] border rounded-full transition-all duration-300 cursor-pointer ${
                active
                  ? "bg-ink text-paper border-ink"
                  : "border-line-strong text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </section>

      {/* Refine */}
      <section className="pb-8">
        <button
          onClick={() => setRefineOpen(true)}
          className="text-[11px] uppercase tracking-[0.16em] text-ink-faint underline underline-offset-4 decoration-line-strong hover:text-ink transition-colors cursor-pointer"
        >
          Refine{activeRefinements > 0 ? ` · ${activeRefinements}` : ""}
        </button>
      </section>

      {ctx.occasion && recs ? (
        <section className="pb-16 animate-fade-in" key={ctx.occasion + JSON.stringify(ctx.refine)}>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="display text-2xl">
              For {occasionLabel(ctx.occasion).toLowerCase()}
            </h2>
            <span className="label-caps">
              {recs.results.length} look{recs.results.length === 1 ? "" : "s"}
            </span>
          </div>

          {recs.results.length === 0 ? (
            <EmptyState
              title="Nothing to recommend"
              message={recs.hint ?? "No wearable combinations available right now."}
            />
          ) : (
            <>
              {/* Mobile: horizontal swipe. Desktop: three columns. */}
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible">
                {recs.results.map((r) => (
                  <RecommendationCard key={r.role} role={r.role} outfit={r.outfit} search={search} />
                ))}
              </div>
              {recs.hint && (
                <p className="mt-8 text-[13px] font-light text-ink-soft border-t hairline pt-5 max-w-md">
                  {recs.hint}
                </p>
              )}
            </>
          )}
        </section>
      ) : (
        quickPick && (
          <section className="pb-16 animate-fade-up">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="display text-2xl">Quick Pick</h2>
              <span className="label-caps">No occasion needed</span>
            </div>
            <Link
              to={`/outfits/${quickPick.key}${search}`}
              className="group grid sm:grid-cols-[minmax(0,420px)_1fr] gap-6 sm:gap-12 items-start"
            >
              <div className="overflow-hidden rounded-card">
                <OutfitTriptych
                  combo={quickPick.combo}
                  className="transition-transform duration-500 group-hover:scale-[1.015]"
                />
              </div>
              <div className="sm:pt-2">
                <div className="flex items-baseline justify-between pb-5 mb-6 border-b hairline">
                  <span className="label-caps">Today's score</span>
                  <p className="display text-5xl leading-none tabular-nums">
                    {formatScore(quickPick.breakdown.total)}
                  </p>
                </div>
                {quickPick.seed?.name && (
                  <p className="display text-xl mb-4">{quickPick.seed.name}</p>
                )}
                <ul className="space-y-2 mb-7">
                  {comboItems(quickPick.combo).map((item) => (
                    <li key={item.id} className="text-[15px] font-light leading-snug">
                      {item.name}
                      <span className="text-ink-faint"> — {item.color.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t hairline pt-5 mb-8">
                  <p className="label-caps mb-2.5">Why it works</p>
                  <ul className="space-y-1.5">
                    {quickPick.reasons.map((r) => (
                      <li key={r} className="text-[13px] font-light text-ink-soft">
                        · {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="inline-block label-caps text-ink border-b border-ink pb-0.5 transition-opacity group-hover:opacity-60">
                  View outfit
                </span>
              </div>
            </Link>
          </section>
        )
      )}

      <RefineSheet open={refineOpen} onOpenChange={setRefineOpen} ctx={ctx} setRefine={setRefine} />
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { comboItems, comboKey, resolveOutfitParam } from "@/lib/data";
import { scoreOutfit } from "@/lib/scoring";
import { useStore, wearStatsForCombo } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { useRecommendationContext, occasionLabel } from "@/lib/context";
import { formatScore, outfitNumber } from "@/lib/format";
import { ItemImage } from "@/components/ItemImage";
import { OutfitScoreBreakdown } from "@/components/OutfitScoreBreakdown";
import { SwapPieceSheet } from "@/components/SwapPieceSheet";
import { RejectSheet } from "@/components/RejectSheet";
import { WearHistory } from "@/components/WearHistory";
import { EmptyState } from "@/components/EmptyState";
import type { OutfitCombo, OutfitSlot } from "@/lib/types";

const SLOT_LABEL: Record<OutfitSlot, string> = { top: "Top", bottom: "Bottom", shoe: "Shoes" };

export function OutfitDetailPage() {
  const { outfitParam } = useParams<{ outfitParam: string }>();
  const navigate = useNavigate();
  const { ctx, search } = useRecommendationContext();
  const store = useStore();
  const { user } = store;
  const { toast } = useToast();

  const resolved = useMemo(
    () => (outfitParam ? resolveOutfitParam(outfitParam) : null),
    [outfitParam],
  );

  const [swapSlot, setSwapSlot] = useState<OutfitSlot | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  if (!resolved) {
    return (
      <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-16">
        <EmptyState
          title="Outfit not found"
          message="This outfit doesn't exist — a piece may have been renamed or removed."
          action={
            <Link to="/" className="label-caps underline underline-offset-4">
              Back to Today
            </Link>
          }
        />
      </div>
    );
  }

  const combo = resolved.combo;
  const key = comboKey(combo);
  const scored = scoreOutfit(combo, ctx, user);
  const seed = resolved.seed;
  const items = comboItems(combo);
  const decision = user.decisions[key];
  const isFavorite = user.favoriteLooks.includes(key);
  const wearStats = wearStatsForCombo(user, key);
  const displayId = seed ? outfitNumber(seed.id) : "Candidate look";

  const handleSwap = (newCombo: OutfitCombo) => {
    navigate(`/outfits/${comboKey(newCombo)}${search}`, { replace: true });
  };

  const handleWearToday = () => {
    const entry = store.wearToday(combo);
    toast("Saved to wear history", { label: "Undo", onAction: () => store.undoWear(entry) });
  };

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 animate-fade-in">
      {/* Header */}
      <div className="pt-8 sm:pt-12 pb-6 flex items-end justify-between gap-4">
        <div>
          <p className="label-caps mb-1.5">
            {displayId}
            {ctx.occasion && <span> · {occasionLabel(ctx.occasion)}</span>}
          </p>
          <h1 className="display text-3xl sm:text-4xl leading-tight">
            {seed?.name ?? "Untitled look"}
          </h1>
        </div>
        <p className="display text-5xl sm:text-6xl leading-none tabular-nums">
          {formatScore(scored.breakdown.total)}
        </p>
      </div>

      <div className="grid sm:grid-cols-[minmax(0,440px)_1fr] gap-8 sm:gap-14 pb-16">
        {/* Garment stack */}
        <div className="space-y-px bg-line rounded-card overflow-hidden">
          {items.map((item, i) => {
            const slot: OutfitSlot = (["top", "bottom", "shoe"] as const)[i];
            return (
              <div key={item.id} className="relative bg-studio group">
                <Link to={`/wardrobe/${item.id}`} className="block aspect-[4/3] overflow-hidden">
                  <ItemImage
                    item={item}
                    className="transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </Link>
                <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-10 bg-gradient-to-t from-paper/95 via-paper/65 to-transparent flex items-end justify-between pointer-events-none">
                  <div>
                    <p className="label-caps">{SLOT_LABEL[slot]}</p>
                    <p className="text-[13px] font-light">
                      {item.name}
                      <span className="text-ink-faint"> — {item.color.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSwapSlot(slot)}
                    className="pointer-events-auto label-caps underline underline-offset-4 hover:text-ink transition-colors cursor-pointer"
                  >
                    Swap
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Meta column */}
        <div className="sm:pt-2">
          {/* Primary actions */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button
              onClick={handleWearToday}
              className="px-6 py-3.5 bg-ink text-paper uppercase tracking-[0.16em] text-[11px] rounded-card hover:opacity-90 transition-opacity cursor-pointer"
            >
              Wear Today
            </button>
            <button
              onClick={() => {
                store.toggleFavoriteLook(key);
                if (!isFavorite) toast("Added to favorites");
              }}
              className={`px-5 py-3.5 border uppercase tracking-[0.16em] text-[11px] rounded-card transition-all cursor-pointer ${
                isFavorite
                  ? "border-ink text-ink animate-heart-pop"
                  : "border-line-strong text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {isFavorite ? "♥ Favorited" : "♡ Favorite"}
            </button>
          </div>

          {/* Why it works */}
          <div className="mb-8">
            <p className="label-caps mb-3">Why it works</p>
            <ul className="space-y-1.5">
              {scored.reasons.map((r) => (
                <li key={r} className="text-sm font-light text-ink-soft">
                  · {r}
                </li>
              ))}
            </ul>
            {seed?.note && (
              <p className="mt-3 text-[13px] font-light text-ink-faint italic">{seed.note}</p>
            )}
          </div>

          <OutfitScoreBreakdown breakdown={scored.breakdown} />

          {/* Approve / Reject */}
          <div className="border-t hairline mt-4 pt-5 mb-8">
            <p className="label-caps mb-3">Your verdict</p>
            {decision ? (
              <div className="flex items-center gap-4">
                <p className="text-sm font-light">
                  {decision.verdict === "approved" ? "Approved" : "Rejected"}
                  {decision.reason && (
                    <span className="text-ink-faint"> — {decision.reason}</span>
                  )}
                </p>
                <button
                  onClick={() => store.clearDecision(combo)}
                  className="label-caps underline underline-offset-4 hover:text-ink transition-colors cursor-pointer"
                >
                  Undo
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    store.approveOutfit(combo);
                    toast("Approved — it will rank higher now");
                  }}
                  className="px-5 py-2.5 border border-ink text-[11px] uppercase tracking-[0.16em] rounded-card hover:bg-ink hover:text-paper transition-all cursor-pointer"
                >
                  Approve
                </button>
                <button
                  onClick={() => setRejectOpen(true)}
                  className="px-5 py-2.5 border border-line-strong text-ink-soft text-[11px] uppercase tracking-[0.16em] rounded-card hover:border-ink hover:text-ink transition-all cursor-pointer"
                >
                  Reject
                </button>
              </div>
            )}
          </div>

          {/* Wear history */}
          <div className="border-t hairline pt-5">
            <p className="label-caps mb-3">Wear history</p>
            <WearHistory {...wearStats} />
          </div>
        </div>
      </div>

      <SwapPieceSheet
        open={swapSlot !== null}
        onOpenChange={(o) => !o && setSwapSlot(null)}
        combo={combo}
        slot={swapSlot}
        ctx={ctx}
        onSwap={handleSwap}
      />
      <RejectSheet
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onReject={(reason) => {
          store.rejectOutfit(combo, reason);
          toast("Rejected — it won't be recommended", {
            label: "Undo",
            onAction: () => store.clearDecision(combo),
          });
        }}
      />
    </div>
  );
}

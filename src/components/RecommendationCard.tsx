import { Link } from "react-router-dom";
import { comboItems } from "@/lib/data";
import { formatScore } from "@/lib/format";
import type { RecommendationRole, ScoredOutfit } from "@/lib/types";
import { OutfitTriptych } from "./OutfitTriptych";

const ROLE_LABELS: Record<RecommendationRole, string> = {
  best: "Best Pick",
  safe: "Safe Pick",
  different: "Different Pick",
};

interface RecommendationCardProps {
  role: RecommendationRole;
  outfit: ScoredOutfit;
  /** Carries the current occasion/refine context into the detail page URL. */
  search?: string;
}

export function RecommendationCard({ role, outfit, search = "" }: RecommendationCardProps) {
  const [top, bottom, shoe] = comboItems(outfit.combo);
  return (
    <Link
      to={`/outfits/${outfit.key}${search}`}
      className="group block w-[78vw] max-w-[330px] sm:w-auto sm:max-w-none shrink-0 snap-center animate-fade-up"
    >
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="label-caps text-ink">{ROLE_LABELS[role]}</span>
        <span className="display text-lg leading-none">{formatScore(outfit.breakdown.total)}</span>
      </div>
      <div className="relative overflow-hidden rounded-card">
        <OutfitTriptych combo={outfit.combo} className="transition-transform duration-500 group-hover:scale-[1.015]" />
      </div>
      <div className="mt-3 space-y-0.5">
        {outfit.seed?.name && <p className="display text-lg leading-tight">{outfit.seed.name}</p>}
        <p className="text-[13px] font-light text-ink-soft leading-snug">
          {top.name} · {bottom.name} · {shoe.name}
        </p>
        {outfit.reasons[0] && (
          <p className="text-[12px] text-ink-faint font-light pt-0.5">{outfit.reasons[0]}</p>
        )}
      </div>
    </Link>
  );
}

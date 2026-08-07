import { useSearchParams } from "react-router-dom";
import type {
  Occasion,
  RecommendationContext,
  StylePreference,
  Weather,
  WorkContext,
} from "./types";

export const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: "factory", label: "Factory" },
  { value: "customer-visit", label: "Customer Visit" },
  { value: "shopping", label: "Shopping" },
  { value: "casual", label: "Casual" },
  { value: "dinner", label: "Dinner" },
  { value: "night-out", label: "Night Out" },
  { value: "travel", label: "Travel" },
];

export const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "rainy", label: "Rainy" },
  { value: "indoor_ac", label: "Indoor AC" },
];

export const STYLE_OPTIONS: { value: StylePreference; label: string }[] = [
  { value: "clean", label: "Clean" },
  { value: "relaxed", label: "Relaxed" },
  { value: "street", label: "Street" },
  { value: "smart", label: "Smart" },
];

export const WORK_CONTEXT_OPTIONS: { value: WorkContext; label: string }[] = [
  { value: "office", label: "Office" },
  { value: "factory-floor", label: "Factory Floor" },
  { value: "customer-visit", label: "Customer Visit" },
];

export function occasionLabel(o: Occasion): string {
  return OCCASIONS.find((x) => x.value === o)?.label ?? o;
}

/** Recommendation context serialized in the URL so pages share it. */
export function useRecommendationContext(): {
  ctx: RecommendationContext;
  setOccasion: (o: Occasion | null) => void;
  setRefine: (key: "weather" | "style" | "work", value: string | null) => void;
  search: string;
} {
  const [params, setParams] = useSearchParams();

  const ctx: RecommendationContext = {
    occasion: (params.get("occasion") as Occasion) || null,
    refine: {
      weather: (params.get("weather") as Weather) || null,
      style: (params.get("style") as StylePreference) || null,
      workContext: (params.get("work") as WorkContext) || null,
    },
  };

  const update = (key: string, value: string | null) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const search = params.toString() ? `?${params.toString()}` : "";

  return {
    ctx,
    setOccasion: (o) => update("occasion", o),
    setRefine: (key, value) => update(key, value),
    search,
  };
}

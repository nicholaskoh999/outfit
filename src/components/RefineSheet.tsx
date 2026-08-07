import { Sheet } from "./ui/Sheet";
import {
  STYLE_OPTIONS,
  WEATHER_OPTIONS,
  WORK_CONTEXT_OPTIONS,
} from "@/lib/context";
import type { RecommendationContext } from "@/lib/types";

interface RefineSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: RecommendationContext;
  setRefine: (key: "weather" | "style" | "work", value: string | null) => void;
}

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
      className={`px-4 py-2 text-[12px] uppercase tracking-[0.12em] border rounded-full transition-all duration-300 cursor-pointer ${
        active
          ? "bg-ink text-paper border-ink"
          : "border-line-strong text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 last:mb-0">
      <p className="label-caps mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Optional refinement — every control is a toggle; nothing is required. */
export function RefineSheet({ open, onOpenChange, ctx, setRefine }: RefineSheetProps) {
  const { weather, style, workContext } = ctx.refine;
  const showWork = ctx.occasion === "factory" || ctx.occasion === "customer-visit";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Refine" description="Optional context for today's recommendations">
      <Group title="Weather">
        {WEATHER_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            active={weather === o.value}
            onClick={() => setRefine("weather", weather === o.value ? null : o.value)}
          />
        ))}
      </Group>
      <Group title="Style">
        {STYLE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            active={style === o.value}
            onClick={() => setRefine("style", style === o.value ? null : o.value)}
          />
        ))}
      </Group>
      {showWork && (
        <Group title="Work Context">
          {WORK_CONTEXT_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              active={workContext === o.value}
              onClick={() => setRefine("work", workContext === o.value ? null : o.value)}
            />
          ))}
        </Group>
      )}
      <button
        onClick={() => onOpenChange(false)}
        className="w-full mt-2 py-3.5 bg-ink text-paper uppercase tracking-[0.16em] text-[11px] rounded-card cursor-pointer hover:opacity-90 transition-opacity"
      >
        Show Outfits
      </button>
    </Sheet>
  );
}

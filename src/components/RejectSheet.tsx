import { Sheet } from "./ui/Sheet";
import type { RejectReason } from "@/lib/types";

const REASONS: RejectReason[] = [
  "too much grey",
  "too formal",
  "too wide",
  "not practical",
  "colors feel wrong",
];

interface RejectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: (reason?: RejectReason) => void;
}

/** The reason is optional — rejecting without one is always allowed. */
export function RejectSheet({ open, onOpenChange, onReject }: RejectSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Not this one" description="Optionally say why — it sharpens future recommendations">
      <p className="text-[13px] font-light text-ink-soft mb-5">
        Why doesn't it work? This helps future recommendations.
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => {
              onReject(r);
              onOpenChange(false);
            }}
            className="px-4 py-2 text-[12px] uppercase tracking-[0.12em] border border-line-strong rounded-full text-ink-soft hover:border-ink hover:text-ink transition-all cursor-pointer"
          >
            {r}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          onReject(undefined);
          onOpenChange(false);
        }}
        className="label-caps underline underline-offset-4 hover:text-ink transition-colors cursor-pointer"
      >
        Skip — just reject
      </button>
    </Sheet>
  );
}

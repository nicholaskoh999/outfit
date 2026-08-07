import { useState } from "react";
import { WEIGHTS } from "@/lib/scoring";
import { formatScore } from "@/lib/format";
import type { ScoreBreakdown } from "@/lib/types";

const FACTORS: { key: keyof typeof WEIGHTS; label: string }[] = [
  { key: "occasion", label: "Occasion fit" },
  { key: "taste", label: "Personal taste" },
  { key: "color", label: "Color harmony" },
  { key: "silhouette", label: "Silhouette balance" },
  { key: "practicality", label: "Practicality" },
];

/** Hidden by default — expands into the five weighted factors. */
export function OutfitScoreBreakdown({ breakdown }: { breakdown: ScoreBreakdown }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t hairline pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="label-caps hover:text-ink transition-colors cursor-pointer"
        aria-expanded={open}
      >
        {open ? "Hide score detail" : "How this score is built"}
      </button>
      {open && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {FACTORS.map((f) => {
            const value = breakdown[f.key];
            return (
              <div key={f.key} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3">
                <span className="text-[12px] font-light text-ink-soft">
                  {f.label}
                  <span className="text-ink-faint"> · {Math.round(WEIGHTS[f.key] * 100)}%</span>
                </span>
                <div className="h-px bg-line relative">
                  <div
                    className="absolute inset-y-[-1px] left-0 bg-ink transition-all duration-700"
                    style={{ width: `${value * 10}%` }}
                  />
                </div>
                <span className="text-[12px] text-right tabular-nums">{formatScore(value)}</span>
              </div>
            );
          })}
          {breakdown.recencyPenalty > 0.05 && (
            <p className="text-[12px] font-light text-ink-faint pt-1">
              −{formatScore(breakdown.recencyPenalty)} worn recently — resting these pieces for a bit
            </p>
          )}
        </div>
      )}
    </div>
  );
}

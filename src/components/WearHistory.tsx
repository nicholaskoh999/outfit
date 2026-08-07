import { formatDate, relativeDate } from "@/lib/format";

interface WearHistoryProps {
  timesWorn: number;
  lastWorn: string | null;
  dates: string[];
}

export function WearHistory({ timesWorn, lastWorn, dates }: WearHistoryProps) {
  if (timesWorn === 0) {
    return <p className="text-[13px] font-light text-ink-faint">Never worn yet.</p>;
  }
  return (
    <div>
      <p className="text-[13px] font-light text-ink-soft mb-2">
        Worn {timesWorn} time{timesWorn === 1 ? "" : "s"}
        {lastWorn && <span className="text-ink-faint"> · last {relativeDate(lastWorn)}</span>}
      </p>
      <ul className="space-y-1">
        {[...dates].reverse().slice(0, 6).map((d) => (
          <li key={d} className="text-[12px] font-light text-ink-faint tabular-nums">
            {formatDate(d)}
          </li>
        ))}
      </ul>
    </div>
  );
}

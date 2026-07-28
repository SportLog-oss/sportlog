import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  tone?: "positive" | "negative" | "warning" | "neutral";
  hint?: string;
}) {
  const toneClass = {
    positive: "text-positive",
    negative: "text-negative",
    warning: "text-warning",
    neutral: "text-foreground",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted leading-tight">{label}</span>
        {Icon && <Icon size={16} className="text-muted shrink-0" />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx("text-2xl font-semibold tabular-nums", toneClass)}>{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

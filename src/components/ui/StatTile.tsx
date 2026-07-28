import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import type { GlossaryKey } from "@/lib/glossary";

export function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone = "neutral",
  hint,
  glossaryKey,
  href,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  tone?: "positive" | "negative" | "warning" | "neutral";
  hint?: string;
  glossaryKey?: GlossaryKey;
  href?: string;
}) {
  const toneClass = {
    positive: "text-positive",
    negative: "text-negative",
    warning: "text-warning",
    neutral: "text-foreground",
  }[tone];

  const content = (
    <div
      className={clsx(
        "rounded-xl border border-border bg-surface p-4 flex flex-col gap-2 min-w-0 h-full",
        href && "transition-colors hover:border-accent/50 hover:bg-surface-raised cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted leading-tight">
          {label}
          {glossaryKey && <InfoTooltip term={glossaryKey} />}
        </span>
        {Icon && <Icon size={16} className="text-muted shrink-0" />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx("text-2xl font-semibold tabular-nums", toneClass)}>{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}

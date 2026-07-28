import clsx from "clsx";
import { TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";
import type { Explanation } from "@/lib/insights";

export function ExplanationPanel({ explanation }: { explanation: Explanation }) {
  const Icon =
    explanation.sentiment === "positive"
      ? TrendingUp
      : explanation.sentiment === "negative"
        ? TrendingDown
        : Minus;

  const toneClass = {
    positive: "text-positive border-positive/30 bg-positive/5",
    negative: "text-negative border-negative/30 bg-negative/5",
    neutral: "text-muted border-border bg-surface-raised",
  }[explanation.sentiment];

  return (
    <div className={clsx("rounded-xl border p-4 space-y-2", toneClass)}>
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Icon size={16} />
        <span>{explanation.headline}</span>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">{explanation.body}</p>
      <div className="flex items-start gap-2 text-sm pt-1 border-t border-border/60 mt-2">
        <Lightbulb size={15} className="mt-0.5 text-accent shrink-0" />
        <span className="text-foreground/90">{explanation.recommendation}</span>
      </div>
    </div>
  );
}

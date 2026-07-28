import clsx from "clsx";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import type { Warning } from "@/lib/insights";

export function WarningBanner({ warning }: { warning: Warning }) {
  const config = {
    info: { icon: Info, className: "border-accent/30 bg-accent-soft text-foreground" },
    warning: { icon: AlertTriangle, className: "border-warning/40 bg-warning/10 text-foreground" },
    critical: { icon: ShieldAlert, className: "border-negative/40 bg-negative/10 text-foreground" },
  }[warning.level];

  const Icon = config.icon;

  return (
    <div className={clsx("rounded-xl border p-4 flex gap-3", config.className)}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">{warning.title}</p>
        <p className="text-sm text-foreground/85 mt-0.5 leading-relaxed">{warning.message}</p>
      </div>
    </div>
  );
}

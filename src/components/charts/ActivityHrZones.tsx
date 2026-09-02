import { HR_ZONE_COLORS } from "@/lib/hrZoneColors";

const ZONE_LABELS: Record<string, string> = {
  z1: "Z1 Locker",
  z2: "Z2 Grundlage",
  z3: "Z3 Tempo",
  z4: "Z4 Schwelle",
  z5: "Z5 Maximal",
};

export function ActivityHrZones({ zones }: { zones: { z1: number; z2: number; z3: number; z4: number; z5: number } }) {
  const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5;
  if (total === 0) return <p className="text-sm text-muted">Keine Herzfrequenz-Zonendaten für diese Einheit.</p>;

  return (
    <div className="space-y-2.5">
      {(["z1", "z2", "z3", "z4", "z5"] as const).map((key) => {
        const seconds = zones[key];
        const pct = (seconds / total) * 100;
        const minutes = Math.round(seconds / 60);
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-muted w-24 shrink-0">{ZONE_LABELS[key]}</span>
            <div className="flex-1 h-2.5 rounded-full bg-surface-raised overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: HR_ZONE_COLORS[key] }} />
            </div>
            <span className="text-xs text-foreground w-20 text-right shrink-0">
              {minutes} min ({pct.toFixed(0)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

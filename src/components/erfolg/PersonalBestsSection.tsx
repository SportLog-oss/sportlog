"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Trophy } from "lucide-react";
import { PB_CATEGORY_META, PB_CATEGORY_ORDER, type PersonalBestCategory } from "@/lib/personalBests";
import { formatClockDuration, formatDate } from "@/lib/format";
import type { PersonalBest } from "@/lib/types";

function formatPbValue(category: PersonalBestCategory, value: number): string {
  const meta = PB_CATEGORY_META[category];
  if (meta.unit === "s") return formatClockDuration(value);
  return `${Math.round(value).toLocaleString("de-DE")} m`;
}

export function PersonalBestsSection() {
  const [bests, setBests] = useState<PersonalBest[] | null>(null);

  useEffect(() => {
    fetch("/api/personal-bests")
      .then((r) => r.json())
      .then(setBests)
      .catch(() => setBests([]));
  }, []);

  if (bests === null) return null;

  return (
    <Card title="Automatische Bestleistungen" subtitle="Automatisch aus deinen Garmin-Aktivitäten erkannt — getrennt von deinen manuellen Bestwerten">
      <div className="divide-y divide-border -mx-4 sm:mx-0">
        {PB_CATEGORY_ORDER.map((category) => {
          const meta = PB_CATEGORY_META[category];
          const pb = bests.find((b) => b.category === category);

          return (
            <div key={category} className="flex items-center justify-between gap-3 px-4 sm:px-0 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Trophy size={15} className="text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{meta.label}</p>
                  {pb ? (
                    <p className="text-xs text-muted">
                      {formatDate(pb.achievedAt)}
                      {pb.previousValue != null && (
                        <> · verbessert von {formatPbValue(category, pb.previousValue)}</>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-muted">Noch keine Bestleistung erkannt</p>
                  )}
                </div>
              </div>
              {pb && <span className="text-sm font-semibold text-accent shrink-0">{formatPbValue(category, pb.value)}</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

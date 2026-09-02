"use client";

import { useState } from "react";
import { IllnessHistorySection } from "@/components/health/IllnessHistorySection";
import { MentalHealthHistorySection } from "@/components/health/MentalHealthHistorySection";
import { WeightHistoryCard } from "@/components/health/WeightHistoryCard";
import type { PlannedSession } from "@/lib/planning";

const TABS = ["Krankheit und Schmerzen", "Mentale Check-ins", "Gewichtsverlauf"] as const;
type Tab = (typeof TABS)[number];

export function HealthTabs({ sessions }: { sessions: PlannedSession[] }) {
  const [tab, setTab] = useState<Tab>("Krankheit und Schmerzen");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border pb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 text-sm rounded-full px-4 py-2 border ${
              tab === t ? "bg-accent-soft text-accent border-accent/50" : "text-muted border-border hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Krankheit und Schmerzen" && <IllnessHistorySection sessions={sessions} />}
      {tab === "Mentale Check-ins" && <MentalHealthHistorySection />}
      {tab === "Gewichtsverlauf" && <WeightHistoryCard />}
    </div>
  );
}

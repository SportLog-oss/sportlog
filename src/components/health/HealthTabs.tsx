"use client";

import { useState, type ReactNode } from "react";
import { IllnessLogSection } from "@/components/health/IllnessLogSection";
import { MentalHealthSection } from "@/components/health/MentalHealthSection";

const TABS = ["Übersicht", "Krankheiten", "Mentale Gesundheit"] as const;
type Tab = (typeof TABS)[number];

export function HealthTabs({ overview, initialTab = "Übersicht" }: { overview: ReactNode; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

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

      {tab === "Übersicht" && overview}
      {tab === "Krankheiten" && <IllnessLogSection />}
      {tab === "Mentale Gesundheit" && <MentalHealthSection />}
    </div>
  );
}

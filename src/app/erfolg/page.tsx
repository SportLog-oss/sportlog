"use client";

import { useState } from "react";
import clsx from "clsx";
import { PageShell } from "@/components/layout/PageShell";
import { GoalsSection } from "@/components/goals/GoalsSection";
import { CompetitionsSection } from "@/components/competitions/CompetitionsSection";
import { PerformanceCurvesSection } from "@/components/erfolg/PerformanceCurvesSection";
import { UnifiedPerformanceBestsSection } from "@/components/erfolg/UnifiedPerformanceBestsSection";

const TABS = ["Ziele", "Wettkämpfe", "Bestleistungen"] as const;
type Tab = (typeof TABS)[number];

export default function ErfolgPage() {
  const [tab, setTab] = useState<Tab>("Ziele");

  return (
    <PageShell title="Erfolg" subtitle="Ziele, Wettkämpfe und Bestleistungen">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium border",
              tab === t ? "bg-accent-soft text-accent border-accent" : "text-muted border-border hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ziele" && <GoalsSection />}
      {tab === "Wettkämpfe" && <CompetitionsSection />}
      {tab === "Bestleistungen" && <div className="space-y-5"><UnifiedPerformanceBestsSection /><PerformanceCurvesSection /></div>}
    </PageShell>
  );
}

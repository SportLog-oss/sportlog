"use client";

import { useState } from "react";
import { HeartPulse, X } from "lucide-react";
import { IllnessLogSection } from "@/components/health/IllnessLogSection";
import { MentalHealthQuickLog } from "@/components/health/MentalHealthQuickLog";

const CATEGORIES = [
  { value: "illness", label: "Krankheit/Verletzung", subtitle: "Krankheit, Schmerzen oder eine Trainingspause schnell dokumentieren." },
  { value: "mental", label: "Mentale Check-ins", subtitle: "Täglicher Check-in oder spontane Stimmung — wie geht es dir gerade?" },
] as const;

export function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("illness");
  if (!open) return null;
  const active = CATEGORIES.find((c) => c.value === category)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold"><HeartPulse size={18} className="text-accent" /> Befinden erfassen</span>
          <button onClick={onClose} aria-label="Schließen" className="text-muted hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="mb-4 flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
                category === c.value ? "border-accent/50 bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <p className="mb-5 text-sm text-muted">{active.subtitle}</p>
        {category === "illness" ? <IllnessLogSection /> : <MentalHealthQuickLog />}
      </div>
    </div>
  );
}

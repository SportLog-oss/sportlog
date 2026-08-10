"use client";

import { HeartPulse, X } from "lucide-react";
import { IllnessLogSection } from "@/components/health/IllnessLogSection";

export function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold"><HeartPulse size={18} className="text-accent" /> Befinden erfassen</span>
          <button onClick={onClose} aria-label="Schließen" className="text-muted hover:text-foreground"><X size={18} /></button>
        </div>
        <p className="mb-5 text-sm text-muted">Krankheit, Schmerzen oder eine Trainingspause schnell dokumentieren.</p>
        <IllnessLogSection />
      </div>
    </div>
  );
}

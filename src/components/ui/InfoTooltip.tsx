"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

export function InfoTooltip({ term }: { term: GlossaryKey }) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[term];

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-muted hover:text-accent transition-colors"
        aria-label={`Was bedeutet ${entry.term}?`}
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg border border-border bg-surface-raised p-3 text-xs text-foreground shadow-lg">
          <p className="font-semibold mb-1">{entry.term}</p>
          <p className="text-muted leading-relaxed">{entry.explanation}</p>
        </div>
      )}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { illnessSessionLinkLabel, resolveIllnessSessionLink } from "@/lib/illnessSessionLink";
import type { PlannedSession } from "@/lib/planning";
import type { IllnessLogEntry } from "@/lib/types";
import { ChevronRight, Stethoscope, Trash2 } from "lucide-react";

// Inclusive day count (a same-day illness counts as 1 day, not 0) — dates are plain
// YYYY-MM-DD strings with no time component, so this is a simple calendar-day diff.
function durationDays(startDate: string, endDate: string | null): number {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function formatDays(days: number): string {
  return `${days} ${days === 1 ? "Tag" : "Tage"}`;
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(`${startDate}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  if (!endDate) return `seit ${start}`;
  const end = new Date(`${endDate}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  return startDate === endDate ? start : `${start} – ${end}`;
}

export function IllnessHistorySection({ sessions }: { sessions: PlannedSession[] }) {
  const [entries, setEntries] = useState<IllnessLogEntry[] | null>(null);
  const [linkPickerFor, setLinkPickerFor] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IllnessLogEntry | null>(null);

  function load() {
    fetch("/api/health/illness").then((r) => r.json()).then(setEntries);
  }

  useEffect(load, []);

  async function setLink(entry: IllnessLogEntry, linkedSessionId: string | null, linkedSessionDismissed: boolean) {
    setLinkPickerFor(null);
    await fetch("/api/health/illness", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, linkedSessionId, linkedSessionDismissed }),
    });
    load();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    await fetch("/api/health/illness", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  if (entries === null) return null;
  const sorted = [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <Card title="Krankheit und Schmerzen · Verlauf" subtitle={`Letzte 12 Wochen · ${sorted.length} ${sorted.length === 1 ? "Eintrag" : "Einträge"}`}>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Einträge.</p>
      ) : (
        <div className="space-y-4">
          {sorted.map((entry) => {
            const active = !entry.endDate;
            const link = resolveIllnessSessionLink(entry, sessions);
            const title = entry.symptoms[0] || "Ohne Angabe";
            const extraSymptoms = entry.symptoms.slice(1);
            return (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center pt-1.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${active ? "bg-negative" : "bg-positive"}`} />
                  <span className="mt-1 w-px flex-1 bg-border" />
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{title}</p>
                    {active && <span className="rounded-full border border-negative/30 bg-negative/10 px-2 py-0.5 text-[11px] font-medium text-negative">Aktiv</span>}
                    <span className="text-xs text-muted">{formatDays(durationDays(entry.startDate, entry.endDate))}</span>
                    <button onClick={() => setPendingDelete(entry)} className="ml-auto text-muted hover:text-negative" aria-label="Eintrag löschen">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{formatDateRange(entry.startDate, entry.endDate)}</p>
                  {(extraSymptoms.length > 0 || entry.notes) && (
                    <p className="mt-1.5 text-sm text-foreground/85">{[extraSymptoms.join(", "), entry.notes].filter(Boolean).join(" · ")}</p>
                  )}

                  {linkPickerFor === entry.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === "__none__") setLink(entry, null, true);
                          else if (value) setLink(entry, value, false);
                        }}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
                      >
                        <option value="" disabled>Einheit wählen…</option>
                        <option value="__none__">Keine betroffene Einheit</option>
                        {sessions.map((session) => (
                          <option key={session.id} value={session.id}>{illnessSessionLinkLabel(session)}</option>
                        ))}
                      </select>
                      <button onClick={() => setLinkPickerFor(null)} className="text-xs text-muted hover:text-foreground">Abbrechen</button>
                    </div>
                  ) : link ? (
                    <button
                      onClick={() => setLinkPickerFor(entry.id)}
                      className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background/30 px-2.5 py-1.5 text-left text-xs font-medium text-muted hover:border-accent/30 hover:text-accent"
                    >
                      <Stethoscope size={13} className="shrink-0 text-accent" />
                      <span className="min-w-0 flex-1 truncate">
                        Betroffene Einheit: {illnessSessionLinkLabel(link.session)}
                        {link.auto && <span className="ml-1 text-muted">· automatisch zugeordnet</span>}
                      </span>
                      <ChevronRight size={13} />
                    </button>
                  ) : (
                    <button onClick={() => setLinkPickerFor(entry.id)} className="mt-2 text-xs text-muted hover:text-accent">
                      Einheit verknüpfen…
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Eintrag löschen?"
          message="Diesen Krankheits-/Schmerzeintrag wirklich löschen?"
          confirmLabel="Löschen"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </Card>
  );
}

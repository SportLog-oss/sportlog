"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CalendarDays, CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import type { GoogleCalendarStatus } from "@/lib/types";

const ADOPTED_EVENT_TYPES = ["Training & Einheiten", "Physio & Behandlung", "Bootshaus & Wasserzeiten", "Vereinstermine & Regatten"];

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function GoogleCalendarCard() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/google-calendar");
      if (!response.ok) throw new Error();
      setStatus(await response.json());
    } catch {
      setError("Verbindungsstatus konnte nicht geladen werden.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state after its internal await, mirroring AthleteDataSyncCard's mount fetch
    void load();
  }, [load]);

  useEffect(() => {
    const result = searchParams.get("google");
    if (!result) return;
    // Reacting to the one-time redirect query param from /api/auth/google/callback — the setState
    // is a direct consequence of that external URL state, not a derived-render optimization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (result === "error") setError("Google Kalender konnte nicht verbunden werden. Bitte erneut versuchen.");
    router.replace("/profil");
  }, [searchParams, router]);

  async function disconnect() {
    setPendingDisconnect(false);
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/google-calendar", { method: "DELETE" });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setError("Trennen fehlgeschlagen.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card
      title="Google Kalender"
      subtitle="Sportrelevante Termine erscheinen in Plan und Heute — SportLog liest nur, es schreibt nichts in deinen Kalender."
      action={
        status?.connected ? (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${status.needsReauth ? "border-warning/30 bg-warning/10 text-warning" : "border-positive/30 bg-positive/10 text-positive"}`}>
            {status.needsReauth ? "Erneut verbinden nötig" : "Aktiv · verbunden"}
          </span>
        ) : (
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Nicht verbunden</span>
        )
      }
    >
      {status?.connected && status.needsReauth && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>Die Verbindung ist abgelaufen (der Consent-Screen läuft im Testing-Modus, Tokens laufen nach 7 Tagen ab). Bitte erneut verbinden, damit Termine wieder aktuell bleiben.</span>
        </div>
      )}

      {status?.connected ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Verbundenes Konto</p>
            <p className="mt-1 text-sm font-medium">{status.googleEmail ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Verbunden seit</p>
            <p className="mt-1 text-sm font-medium">{formatTimestamp(status.connectedAt)}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          Noch kein Google-Konto verknüpft.
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Terminarten, die übernommen werden</p>
        <ul className="space-y-1.5">
          {ADOPTED_EVENT_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-2 text-sm text-foreground/85">
              <CheckCircle2 size={13} className="shrink-0 text-accent" /> {type}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        {status?.connected ? (
          <>
            {status.needsReauth && (
              <a href="/api/auth/google/connect" className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black">
                <CalendarDays size={14} /> Erneut verbinden
              </a>
            )}
            <button
              type="button"
              disabled={disconnecting}
              onClick={() => setPendingDisconnect(true)}
              className="rounded-lg border border-negative/40 px-3 py-2 text-sm font-medium text-negative hover:bg-negative/10 disabled:opacity-50"
            >
              {disconnecting ? <LoaderCircle size={14} className="animate-spin" /> : "Trennen"}
            </button>
          </>
        ) : (
          <a href="/api/auth/google/connect" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-accent/40 hover:text-accent">
            <CalendarDays size={14} /> Google Kalender verbinden
          </a>
        )}
        <span className="text-xs text-muted">Nur Lesezugriff · jederzeit widerrufbar</span>
      </div>

      {pendingDisconnect && (
        <ConfirmDialog
          title="Google Kalender trennen?"
          message="Die Verbindung wird entfernt und bereits übernommene Termine verschwinden aus Plan und Heute."
          confirmLabel="Trennen"
          onConfirm={disconnect}
          onCancel={() => setPendingDisconnect(false)}
        />
      )}
    </Card>
  );
}

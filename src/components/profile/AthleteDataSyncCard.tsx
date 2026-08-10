"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Cloud, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AthleteDataSyncStatus } from "@/lib/types";

export function AthleteDataSyncCard() {
  const [status, setStatus] = useState<AthleteDataSyncStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus(await fetchSyncStatus());
  }, []);

  useEffect(() => {
    let active = true;
    fetchSyncStatus()
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Status nicht verfügbar.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    setStatus((current) => (current ? { ...current, status: "syncing" } : current));
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Synchronisierung fehlgeschlagen.");
      await load();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Synchronisierung fehlgeschlagen.");
      await load().catch(() => undefined);
    } finally {
      setRefreshing(false);
    }
  }

  const presentation = statusPresentation(status);
  const Icon = presentation.icon;

  return (
    <Card title="AthleteData-Synchronisation" subtitle="Echter Status des zentralen Datenimports">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${presentation.iconClass}`}>
          <Icon size={17} className={presentation.icon === Loader2 ? "animate-spin" : undefined} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{presentation.label}</p>
          <p className="mt-0.5 text-xs text-muted">
            {status?.lastSuccessAt ? `Letzter erfolgreicher Import: ${formatTimestamp(status.lastSuccessAt)}` : "Noch kein erfolgreicher Import"}
          </p>
          {status?.savedKeys.length ? (
            <p className="mt-1 text-xs text-muted">{status.savedKeys.length} Datenbereiche zuletzt aktualisiert</p>
          ) : null}
          {status?.failures.length ? (
            <p className="mt-1 text-xs text-warning">{status.failures.length} Datenbereiche mit Fehlern</p>
          ) : null}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-negative">{error}</p>}
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing || status?.status === "syncing"}
        className="mt-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
        {refreshing ? "Synchronisiert…" : "Jetzt synchronisieren"}
      </button>
    </Card>
  );
}

function statusPresentation(status: AthleteDataSyncStatus | null) {
  if (!status) return { label: "Status wird geladen…", icon: Loader2, iconClass: "bg-surface-raised text-muted" };
  if (status.status === "syncing") return { label: "Synchronisierung läuft", icon: Loader2, iconClass: "bg-accent-soft text-accent" };
  if (status.status === "success") return { label: "Aktuell", icon: CheckCircle2, iconClass: "bg-positive/10 text-positive" };
  if (status.status === "partial") return { label: "Teilweise aktualisiert", icon: TriangleAlert, iconClass: "bg-warning/10 text-warning" };
  if (status.status === "failed") return { label: "Letzter Import fehlgeschlagen", icon: TriangleAlert, iconClass: "bg-negative/10 text-negative" };
  return { label: "Noch nicht synchronisiert", icon: Cloud, iconClass: "bg-surface-raised text-muted" };
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

async function fetchSyncStatus(): Promise<AthleteDataSyncStatus> {
  const response = await fetch("/api/sync/status");
  if (!response.ok) throw new Error("Sync-Status konnte nicht geladen werden.");
  return response.json() as Promise<AthleteDataSyncStatus>;
}

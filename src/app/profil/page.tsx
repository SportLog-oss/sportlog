"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut, Ruler, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { ReminderSettingsCard } from "@/components/ReminderSettingsCard";
import { WeightHistoryCard } from "@/components/health/WeightHistoryCard";
import { localIsoDate } from "@/lib/format";
import { AthleteDataSyncCard } from "@/components/profile/AthleteDataSyncCard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { AccountSection } from "@/components/profile/AccountSection";
import { GoogleCalendarCard } from "@/components/profile/GoogleCalendarCard";
import type { Profile, ProfileFieldName } from "@/lib/types";

function numOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ weightKg: "", hrRest: "", hrMax: "", vo2max: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: Profile) => {
        setProfile(p);
        setForm({
          weightKg: p.weightKg != null ? String(p.weightKg) : "",
          hrRest: p.hrRest != null ? String(p.hrRest) : "",
          hrMax: p.hrMax != null ? String(p.hrMax) : "",
          vo2max: p.vo2max != null ? String(p.vo2max) : "",
        });
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const weightKg = numOrNull(form.weightKg);
      const profileRequest = fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(weightKg === null ? { weightKg: null } : {}),
          hrRest: numOrNull(form.hrRest),
          hrMax: numOrNull(form.hrMax),
          vo2max: numOrNull(form.vo2max),
        }),
      });
      const weightRequest =
        weightKg === null
          ? Promise.resolve(null)
          : fetch("/api/weight", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ weightKg, measuredOn: localIsoDate() }),
            });
      const [profileResponse, weightResponse] = await Promise.all([profileRequest, weightRequest]);
      if (!profileResponse.ok || (weightResponse && !weightResponse.ok)) throw new Error("Speichern fehlgeschlagen");
      const updated = (await profileResponse.json()) as Profile;
      setProfile({ ...updated, weightKg });
      window.dispatchEvent(new Event("sportlog:weight-updated"));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function adoptImported(field: ProfileFieldName) {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adoptImported: field }),
    });
    if (!response.ok) return;
    const updated = (await response.json()) as Profile;
    setProfile(updated);
    setForm({
      weightKg: updated.weightKg != null ? String(updated.weightKg) : "",
      hrRest: updated.hrRest != null ? String(updated.hrRest) : "",
      hrMax: updated.hrMax != null ? String(updated.hrMax) : "",
      vo2max: updated.vo2max != null ? String(updated.vo2max) : "",
    });
  }

  return (
    <PageShell title="Profil" subtitle="Stammdaten, Erinnerungen und Konto">
      {profile && <ProfileHeader profile={profile} />}

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Stammdaten">
          {!profile ? (
            <p className="text-sm text-muted">Lädt…</p>
          ) : (
            <form onSubmit={save} className="space-y-3">
              <Field label="Gewicht (kg)" source={sourceLabel(profile, "weightKg")} value={form.weightKg} onChange={(v) => setForm((f) => ({ ...f, weightKg: v }))} />
              <Field label="Ruhepuls (bpm)" source={sourceLabel(profile, "hrRest")} value={form.hrRest} onChange={(v) => setForm((f) => ({ ...f, hrRest: v }))} />
              <Field label="Maximalpuls (bpm)" source={sourceLabel(profile, "hrMax")} value={form.hrMax} onChange={(v) => setForm((f) => ({ ...f, hrMax: v }))} />
              <Field label="VO2max" source={sourceLabel(profile, "vo2max")} value={form.vo2max} onChange={(v) => setForm((f) => ({ ...f, vo2max: v }))} />
              <ImportedValues profile={profile} onAdopt={adoptImported} />
              <div className="flex items-center gap-3">
                <button disabled={saving} className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50">
                  {saving ? "Speichert…" : "Speichern"}
                </button>
                {saved && (
                  <span className="flex items-center gap-1 text-xs text-positive">
                    <CheckCircle2 size={13} /> Gespeichert
                  </span>
                )}
              </div>
            </form>
          )}
        </Card>

        <AthleteDataSyncCard />

        <Card title="Einstellungen">
          <div className="space-y-3">
            <SettingsRow icon={Ruler} label="Einheiten" value="Metrisch (km, kg)" />
            <SettingsRow icon={ShieldCheck} label="Datenschutz" value="Daten werden nur für dich gespeichert" />
          </div>
        </Card>

        <ReminderSettingsCard />

        <Suspense fallback={null}>
          <GoogleCalendarCard />
        </Suspense>

        <WeightHistoryCard />
      </div>

      {profile && <AccountSection profile={profile} onUpdate={setProfile} />}

      <button
        onClick={logout}
        className="flex items-center gap-2 rounded-lg border border-negative/40 text-negative px-3 py-2 text-sm font-medium hover:bg-negative/10"
      >
        <LogOut size={15} /> Abmelden
      </button>
    </PageShell>
  );
}

const IMPORT_LABELS: Record<ProfileFieldName, string> = {
  weightKg: "Gewicht (kg)",
  hrRest: "Ruhepuls (bpm)",
  hrMax: "Maximalpuls (bpm)",
  vo2max: "VO2max",
  ftpWatts: "FTP (W)",
};

function ImportedValues({
  profile,
  onAdopt,
}: {
  profile: Profile;
  onAdopt: (field: ProfileFieldName) => Promise<void>;
}) {
  const entries = Object.entries(profile.importedValues) as [ProfileFieldName, NonNullable<Profile["importedValues"][ProfileFieldName]>][];
  if (entries.length === 0) return <p className="text-xs text-muted">Noch keine importierten Stammdaten vorhanden.</p>;
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold">Garmin / AthleteData</p>
      {entries.map(([field, imported]) => (
        <div key={field} className="flex items-center justify-between gap-3 text-xs">
          <span>
            {IMPORT_LABELS[field]}: {imported.value} · {imported.observedAt.slice(0, 10)}
            <span className="ml-1 text-muted">
              ({profile.fieldSources[field] === "Garmin / AthleteData" ? "übernommen" : "Import verfügbar"})
            </span>
          </span>
          {profile.fieldSources[field] !== "Garmin / AthleteData" && (
            <button type="button" className="text-accent hover:underline" onClick={() => void onAdopt(field)}>
              Importierten Wert übernehmen
            </button>
          )}
        </div>
      ))}
      {!profile.importedValues.hrMax && (
        <p className="text-xs text-muted">Maximalpuls und persönliche Zonengrenzen werden nicht zuverlässig geliefert und bleiben manuell.</p>
      )}
    </div>
  );
}

function sourceLabel(profile: Profile, field: ProfileFieldName) {
  return profile.fieldSources[field] === "Garmin / AthleteData" ? "importiert" : profile.fieldSources[field] === "manual" ? "manuell" : "leer";
}

function Field({ label, source, value, onChange }: { label: string; source: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label} · {source}</span>
      <input
        type="number"
        className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SettingsRow({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-muted">
        <Icon size={15} />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted">{value}</p>
      </div>
    </div>
  );
}

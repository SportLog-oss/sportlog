"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { Profile } from "@/lib/types";
import { CheckCircle2, LoaderCircle, Upload, User } from "lucide-react";

type FormState = { displayName: string; email: string; sportType: string; club: string; trainerName: string };

function formFromProfile(profile: Profile): FormState {
  return {
    displayName: profile.displayName ?? "",
    email: profile.email ?? "",
    sportType: profile.sportType ?? "",
    club: profile.club ?? "",
    trainerName: profile.trainerName ?? "",
  };
}

export function AccountSection({ profile, onUpdate }: { profile: Profile; onUpdate: (updated: Profile) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [form, setForm] = useState<FormState>(() => formFromProfile(profile));
  const [syncedProfile, setSyncedProfile] = useState(profile);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-sync the editable form whenever the profile prop actually changes underneath us (e.g. an
  // avatar upload elsewhere triggers onUpdate) — adjusted during render per React's guidance
  // instead of in an effect, so it doesn't cause an extra cascading render.
  if (profile !== syncedProfile) {
    setSyncedProfile(profile);
    setForm(formFromProfile(profile));
  }

  function resetForm() {
    setForm(formFromProfile(profile));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setNotice(null);
  }

  async function uploadAvatar(file: File) {
    setAvatarBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Upload fehlgeschlagen");
      onUpdate(data as Profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!response.ok) throw new Error("Entfernen fehlgeschlagen");
      onUpdate(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entfernen fehlgeschlagen");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function save() {
    if (newPassword || confirmPassword || currentPassword) {
      if (newPassword.length < 10) return setError("Neues Passwort muss mindestens 10 Zeichen haben.");
      if (newPassword !== confirmPassword) return setError("Neues Passwort und Wiederholung stimmen nicht überein.");
      if (!currentPassword) return setError("Bitte das aktuelle Passwort eingeben.");
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const profileResponse = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim() || null,
          sportType: form.sportType.trim() || null,
          club: form.club.trim() || null,
          trainerName: form.trainerName.trim() || null,
        }),
      });
      if (!profileResponse.ok) throw new Error("Änderungen konnten nicht gespeichert werden.");
      const updated = (await profileResponse.json()) as Profile;

      const notices: string[] = [];

      if (form.email.trim() && form.email.trim() !== profile.email) {
        const emailResponse = await fetch("/api/profile/email", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email.trim() }),
        });
        const emailData = await emailResponse.json();
        if (!emailResponse.ok) throw new Error(emailData?.error ?? "E-Mail-Änderung fehlgeschlagen.");
        notices.push(`Bestätigungs-Mail an ${form.email.trim()} gesendet — die Änderung wird erst nach Bestätigung aktiv.`);
      }

      if (newPassword) {
        const passwordResponse = await fetch("/api/profile/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const passwordData = await passwordResponse.json();
        if (!passwordResponse.ok) throw new Error(passwordData?.error ?? "Passwort konnte nicht geändert werden.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        notices.push("Passwort geändert.");
      }

      onUpdate(updated);
      setNotice(notices.length > 0 ? notices.join(" ") : "Änderungen gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Änderungen konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Konto"
      subtitle="Persönliche Angaben, Profilbild und Zugangsdaten · Einzelbenutzer-Zugang"
      action={
        <button onClick={() => setCollapsed((c) => !c)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground">
          {collapsed ? "Bereich öffnen" : "Bereich schließen"}
        </button>
      }
    >
      {!collapsed && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Profilbild</p>
              <div className="flex items-center gap-4">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
                  <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <User size={26} />
                  </span>
                )}
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadAvatar(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    {avatarBusy ? <LoaderCircle size={13} className="animate-spin" /> : <Upload size={13} />} Bild hochladen
                  </button>
                  {profile.avatarUrl && (
                    <button type="button" disabled={avatarBusy} onClick={removeAvatar} className="text-left text-xs text-muted hover:text-negative disabled:opacity-50">
                      Entfernen
                    </button>
                  )}
                  <p className="text-xs text-muted">JPG oder PNG, max. 5 MB</p>
                </div>
              </div>
            </div>

            <label className="block rounded-xl border border-border p-4 text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Name</span>
              <input
                value={form.displayName}
                onChange={(event) => setForm((f) => ({ ...f, displayName: event.target.value }))}
                placeholder="z. B. Marcel Kruse"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
              <span className="mt-1.5 block text-xs text-muted">Erscheint im Kopfbereich</span>
            </label>

            <label className="block rounded-xl border border-border p-4 text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">E-Mail-Adresse</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
              <span className="mt-1.5 block text-xs text-muted">Login und Empfänger für Erinnerungen</span>
            </label>

            <label className="block rounded-xl border border-border p-4 text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Sportart</span>
              <input
                value={form.sportType}
                onChange={(event) => setForm((f) => ({ ...f, sportType: event.target.value }))}
                placeholder="z. B. Rudern"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
              <span className="mt-1.5 block text-xs text-muted">Bestimmt Zonenmodell und Auswertungen</span>
            </label>

            <label className="block rounded-xl border border-border p-4 text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Verein</span>
              <input
                value={form.club}
                onChange={(event) => setForm((f) => ({ ...f, club: event.target.value }))}
                placeholder="z. B. Ruderclub Potsdam"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
              <span className="mt-1.5 block text-xs text-muted">Wird im Kopfbereich angezeigt</span>
            </label>

            <label className="block rounded-xl border border-border p-4 text-sm">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Trainer</span>
              <input
                value={form.trainerName}
                onChange={(event) => setForm((f) => ({ ...f, trainerName: event.target.value }))}
                placeholder="z. B. Tobi Hennig"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
              <span className="mt-1.5 block text-xs text-muted">Wird im Kopfbereich angezeigt</span>
            </label>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Passwort ändern</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1.5 block text-xs text-muted">Aktuelles Passwort</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent" />
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block text-xs text-muted">Neues Passwort</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent" />
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block text-xs text-muted">Neues Passwort wiederholen</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent" />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted">Mindestens 10 Zeichen · Nach dem Ändern bleibst du auf diesem Gerät angemeldet.</p>
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}
          {notice && (
            <p className="flex items-start gap-1.5 text-sm text-positive">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> {notice}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={resetForm} disabled={saving} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted hover:text-foreground disabled:opacity-50">
              Verwerfen
            </button>
            <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
              {saving && <LoaderCircle size={16} className="animate-spin" />} Änderungen speichern
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

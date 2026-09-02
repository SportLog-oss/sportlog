import type { Profile } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function ProfileHeader({ profile, freshnessLabel }: { profile: Profile; freshnessLabel?: string }) {
  const name = profile.displayName || "Athlet";
  const metaParts = [profile.sportType, profile.club, profile.trainerName ? `Trainer ${profile.trainerName}` : null].filter(Boolean);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not an optimizable static asset
          <img src={profile.avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent">
            {initials(name)}
          </span>
        )}
        <div>
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{name}</h1>
          <p className="mt-1 text-sm text-muted">{metaParts.length > 0 ? metaParts.join(" · ") : "Sportart, Verein und Trainer im Konto-Bereich ergänzen"}</p>
        </div>
      </div>
      {freshnessLabel && <span className="text-xs text-muted sm:text-right">{freshnessLabel}</span>}
    </section>
  );
}

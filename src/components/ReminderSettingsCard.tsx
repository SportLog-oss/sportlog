"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Bell } from "lucide-react";
import type { ReminderPreferences, ReminderType } from "@/lib/types";

const TYPE_LABELS: Record<ReminderType, string> = {
  "log-training": "Training protokollieren",
  "update-illness": "Krankheitsstatus aktualisieren",
  "log-mental-health": "Mentaler Check-in",
  "daily-checkin": "Allgemeiner Tagescheck",
};

export function ReminderSettingsCard() {
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/reminders/preferences")
      .then((r) => r.json())
      .then(setPrefs);
  }, []);

  async function update(next: Partial<Pick<ReminderPreferences, "enabledTypes" | "preferredHour">>) {
    if (!prefs) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    setSaving(true);
    try {
      await fetch("/api/reminders/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } finally {
      setSaving(false);
    }
  }

  function toggle(type: ReminderType) {
    if (!prefs) return;
    const enabled = prefs.enabledTypes.includes(type)
      ? prefs.enabledTypes.filter((t) => t !== type)
      : [...prefs.enabledTypes, type];
    update({ enabledTypes: enabled });
  }

  if (!prefs) return null;

  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          <Bell size={14} /> Erinnerungen
        </span>
      }
      subtitle="Einmal täglich, nur wenn etwas offen ist"
    >
      <div className="space-y-2">
        {(Object.keys(TYPE_LABELS) as ReminderType[]).map((type) => (
          <label key={type} className="flex items-center justify-between text-sm">
            <span>{TYPE_LABELS[type]}</span>
            <input
              type="checkbox"
              checked={prefs.enabledTypes.includes(type)}
              onChange={() => toggle(type)}
              disabled={saving}
              className="accent-accent w-4 h-4"
            />
          </label>
        ))}
      </div>
    </Card>
  );
}

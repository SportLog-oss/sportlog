"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

export function NotesSection({ activityId }: { activityId: number }) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/activity-notes")
      .then((r) => r.json())
      .then((notes: { activityId: number; note: string }[]) => {
        const existing = notes.find((n) => n.activityId === activityId)?.note ?? "";
        setNote(existing);
        setSaved(existing);
        setLoaded(true);
      });
  }, [activityId]);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/activity-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, note }),
      });
      setSaved(note);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <Card title="Notizen">
      <div className="space-y-2">
        <textarea
          className="w-full min-h-24 bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm resize-y"
          placeholder="Noch keine Notizen zu dieser Einheit."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {note !== saved && (
          <button
            onClick={save}
            disabled={saving}
            className="bg-accent text-black rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
        )}
      </div>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";
import type { MentalHealthCheckin } from "@/lib/types";

const EMOTION_TAGS = [
  "Ruhig",
  "Zufrieden",
  "Motiviert",
  "Erschöpft",
  "Angespannt",
  "Frustriert",
  "Zuversichtlich",
  "Gereizt",
  "Ausgeglichen",
  "Überfordert",
  "Energiegeladen",
  "Nervös",
];

const INFLUENCE_TAGS = ["Training", "Wettkampf", "Schlaf", "Gesundheit", "Arbeit/Schule", "Beziehungen", "Erholung", "Sonstiges"];

function valenceColor(v: number): { from: string; to: string; label: string } {
  if (v <= -0.5) return { from: "#1e3a5f", to: "#3b82f6", label: "Sehr unangenehm" };
  if (v < -0.15) return { from: "#1f4a5f", to: "#38bdf8", label: "Unangenehm" };
  if (v <= 0.15) return { from: "#2a3038", to: "#8b96a5", label: "Neutral" };
  if (v < 0.5) return { from: "#4a3a1a", to: "#fbbf24", label: "Angenehm" };
  return { from: "#4a2f0a", to: "#f59e0b", label: "Sehr angenehm" };
}

function MoodOrb({ value }: { value: number }) {
  const { from, to, label } = valenceColor(value);
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-32 h-32 rounded-full transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${to}, ${from} 70%)`,
          boxShadow: `0 0 40px 6px ${to}55`,
          animation: "sportlog-mood-pulse 3.2s ease-in-out infinite",
        }}
      />
      <p className="text-sm font-medium text-foreground">{label}</p>
      <style>{`
        @keyframes sportlog-mood-pulse {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.06); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function MentalHealthSection() {
  const [checkins, setCheckins] = useState<MentalHealthCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [valence, setValence] = useState(0);
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [influenceTags, setInfluenceTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/mental-health")
      .then((r) => r.json())
      .then((d) => {
        setCheckins(d);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/mental-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "emotion", valence, emotionTags, influenceTags, note }),
      });
      setValence(0);
      setEmotionTags([]);
      setInfluenceTags([]);
      setNote("");
      load();
    } finally {
      setSaving(false);
    }
  }

  function toggle(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  if (loading) return null;

  const trendData = [...checkins]
    .reverse()
    .slice(-30)
    .map((c) => ({ date: c.timestamp.slice(0, 10), valence: +c.valence.toFixed(2) }));

  return (
    <div className="space-y-6">
      <Card title="Check-in" subtitle="Wie fühlst du dich gerade?">
        <div className="flex flex-col items-center gap-6">
          <MoodOrb value={valence} />
          <div className="w-full max-w-md">
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={valence}
              onChange={(e) => setValence(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>Sehr unangenehm</span>
              <span>Sehr angenehm</span>
            </div>
          </div>

          <div className="w-full max-w-md space-y-4">
            <div>
              <p className="text-xs text-muted mb-2">Welche Gefühle beschreiben es am besten?</p>
              <div className="flex flex-wrap gap-2">
                {EMOTION_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggle(emotionTags, setEmotionTags, tag)}
                    className={`text-xs rounded-full px-3 py-1.5 border ${
                      emotionTags.includes(tag) ? "bg-accent-soft text-accent border-accent/50" : "text-muted border-border"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted mb-2">Was beeinflusst dich gerade am meisten?</p>
              <div className="flex flex-wrap gap-2">
                {INFLUENCE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggle(influenceTags, setInfluenceTags, tag)}
                    className={`text-xs rounded-full px-3 py-1.5 border ${
                      influenceTags.includes(tag) ? "bg-accent-soft text-accent border-accent/50" : "text-muted border-border"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional: was steckt dahinter?"
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm min-h-16"
            />

            <button
              onClick={save}
              disabled={saving}
              className="w-full bg-accent text-black rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Speichern…" : "Check-in speichern"}
            </button>
          </div>
        </div>
      </Card>

      {trendData.length > 1 && (
        <Card title="Verlauf" subtitle="Valenz der letzten Check-ins (-1 bis 1)">
          <TrendChart data={trendData} lines={[{ key: "valence", color: "var(--accent)", name: "Valenz" }]} referenceLine={0} />
        </Card>
      )}

      {checkins.length > 0 && (
        <Card title="Letzte Check-ins">
          <div className="space-y-2">
            {checkins.slice(0, 10).map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-muted w-32 shrink-0">{new Date(c.timestamp).toLocaleString("de-DE")}</span>
                <span className="flex-1">{c.emotionTags.join(", ") || "–"}</span>
                <span className="text-xs text-muted">{c.valence.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

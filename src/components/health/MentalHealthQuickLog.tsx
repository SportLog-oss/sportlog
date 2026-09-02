"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { CheckCircle2 } from "lucide-react";
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

function valenceLabel(v: number): string {
  if (v <= -0.5) return "Sehr unangenehm";
  if (v < -0.15) return "Unangenehm";
  if (v <= 0.15) return "Neutral";
  if (v < 0.5) return "Angenehm";
  return "Sehr angenehm";
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(from: [number, number, number], to: [number, number, number], t: number): string {
  return `rgb(${Math.round(lerp(from[0], to[0], t))}, ${Math.round(lerp(from[1], to[1], t))}, ${Math.round(lerp(from[2], to[2], t))})`;
}

// Same closed-blob point count on every render (only the radius per point changes), which is what
// lets the browser smoothly transition the SVG path's `d` attribute between valence values instead
// of jumping — see the `transition: "d 300ms ..."` below.
const BLOB_POINTS = 48;

// Apple-Health-Prinzip übernommen (Konzept 005, Ergänzung 2/"Update 01.09.2026"): die Form wird bei
// niedriger Valenz rund/gedämpft und bei hoher Valenz strahlig/blütenförmig — aber vollständig in
// SportLogs Teal-Palette statt Apples Blau-bis-Gold-Skala. "sehr unangenehm" bis "sehr angenehm".
function blobPath(valence: number): string {
  const t = (valence + 1) / 2; // 0..1
  const radius = 34;
  const petals = Math.round(lerp(5, 9, t));
  const amplitude = lerp(0.035, 0.24, t) * radius;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < BLOB_POINTS; i++) {
    const angle = (i / BLOB_POINTS) * Math.PI * 2;
    const r = radius + amplitude * Math.sin(angle * petals);
    points.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) });
  }
  const start = { x: (points[0].x + points[points.length - 1].x) / 2, y: (points[0].y + points[points.length - 1].y) / 2 };
  let d = `M ${start.x} ${start.y}`;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    d += ` Q ${p1.x} ${p1.y} ${mid.x} ${mid.y}`;
  }
  return `${d} Z`;
}

const BLOB_EDGE_LOW: [number, number, number] = [12, 43, 41];
const BLOB_EDGE_HIGH: [number, number, number] = [37, 216, 207];
const BLOB_CORE_LOW: [number, number, number] = [32, 84, 79];
const BLOB_CORE_HIGH: [number, number, number] = [214, 255, 250];

function MoodOrb({ value }: { value: number }) {
  const t = (value + 1) / 2;
  const edge = lerpColor(BLOB_EDGE_LOW, BLOB_EDGE_HIGH, t);
  const core = lerpColor(BLOB_CORE_LOW, BLOB_CORE_HIGH, t);
  const glow = lerp(8, 34, t);
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 100 100" className="h-36 w-36 animate-[sportlog-mood-pulse_3.2s_ease-in-out_infinite]">
        <defs>
          <radialGradient id="sportlog-mood-fill" cx="42%" cy="38%" r="65%">
            <stop offset="0%" stopColor={core} />
            <stop offset="100%" stopColor={edge} />
          </radialGradient>
        </defs>
        <path
          d={blobPath(value)}
          fill="url(#sportlog-mood-fill)"
          style={{ transition: "d 300ms ease-out, filter 300ms ease-out", filter: `drop-shadow(0 0 ${glow}px ${edge}99)` }}
        />
      </svg>
      <p className="text-sm font-medium text-foreground">{valenceLabel(value)}</p>
      <style>{`
        @keyframes sportlog-mood-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }
      `}</style>
    </div>
  );
}

// Derives an overall -1..1 valence from the 4 daily-check-in dimensions so the existing
// valence-based trend chart stays meaningful for 'mood' rows too — stress is inverted since
// higher stress should pull the aggregate negative, unlike the other three.
function deriveValence(motivation: number, stress: number, energy: number, sleepQuality: number): number {
  const avg = (motivation + (10 - stress) + energy + sleepQuality) / 4;
  return +((avg / 10) * 2 - 1).toFixed(2);
}

const todayStr = () => new Date().toISOString().slice(0, 10);

function DailyCheckinCard({ checkins, onSaved }: { checkins: MentalHealthCheckin[]; onSaved: () => void }) {
  const todaysCheckin = checkins.find((c) => c.type === "mood" && c.timestamp.slice(0, 10) === todayStr());
  const [showForm, setShowForm] = useState(false);
  const [motivation, setMotivation] = useState(5);
  const [stress, setStress] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/mental-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "mood",
          valence: deriveValence(motivation, stress, energy, sleepQuality),
          motivation,
          stress,
          energy,
          sleepQuality,
        }),
      });
      setShowForm(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (todaysCheckin && !showForm) {
    return (
      <Card title="Täglicher Check-in" subtitle="Einmal pro Tag — Motivation, Stress, Energie, Schlafqualität">
        <div className="flex items-center gap-2 text-sm text-positive mb-3">
          <CheckCircle2 size={16} />
          Heute bereits erfasst
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted">Motivation</p>
            <p className="font-medium">{todaysCheckin.motivation ?? "–"} / 10</p>
          </div>
          <div>
            <p className="text-xs text-muted">Stress</p>
            <p className="font-medium">{todaysCheckin.stress ?? "–"} / 10</p>
          </div>
          <div>
            <p className="text-xs text-muted">Energie</p>
            <p className="font-medium">{todaysCheckin.energy ?? "–"} / 10</p>
          </div>
          <div>
            <p className="text-xs text-muted">Schlafqualität</p>
            <p className="font-medium">{todaysCheckin.sleepQuality ?? "–"} / 10</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="text-xs text-accent mt-3">
          Nochmal ausfüllen
        </button>
      </Card>
    );
  }

  return (
    <Card title="Täglicher Check-in" subtitle="Einmal pro Tag — Motivation, Stress, Energie, Schlafqualität">
      <div className="space-y-4 max-w-md">
        <ScaleSlider label="Motivation" value={motivation} onChange={setMotivation} />
        <ScaleSlider label="Stress" value={stress} onChange={setStress} />
        <ScaleSlider label="Mentale Energie" value={energy} onChange={setEnergy} />
        <ScaleSlider label="Schlafqualität" value={sleepQuality} onChange={setSleepQuality} />
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-accent text-black rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Speichern…" : "Check-in speichern"}
        </button>
      </div>
    </Card>
  );
}

function ScaleSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>{label}</span>
        <span>{value} / 10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

/** Erfassen-Formulare für mentale Check-ins (Konzept 005: die tägliche Eingabe lebt im globalen
 * Befinden-erfassen-Panel und in Heute/Profil, nicht mehr auf der Gesundheit-Seite selbst — dort
 * gibt es nur noch den Verlauf, siehe MentalHealthHistorySection). */
export function MentalHealthQuickLog() {
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

  return (
    <div className="space-y-6">
      <DailyCheckinCard checkins={checkins} onSaved={load} />

      <Card title="Stimmung erfassen" subtitle="Spontan, so oft du möchtest — wie fühlst du dich gerade?">
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
              {saving ? "Speichern…" : "Stimmung speichern"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

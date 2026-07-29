import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { TrendChart } from '@/components/charts/TrendChart';
import { api } from '@/lib/api';
import type { MentalHealthCheckin } from '@/lib/types';

const EMOTION_TAGS = [
  'Ruhig', 'Zufrieden', 'Motiviert', 'Erschöpft', 'Angespannt',
  'Frustriert', 'Zuversichtlich', 'Gereizt', 'Ausgeglichen', 'Überfordert', 'Energiegeladen', 'Nervös',
];
const INFLUENCE_TAGS = ['Training', 'Wettkampf', 'Schlaf', 'Gesundheit', 'Arbeit/Schule', 'Beziehungen', 'Erholung', 'Sonstiges'];
const VALENCE_STEPS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];

function valenceColor(v: number): { color: string; label: string } {
  if (v <= -0.5) return { color: '#3b82f6', label: 'Sehr unangenehm' };
  if (v < -0.15) return { color: '#38bdf8', label: 'Unangenehm' };
  if (v <= 0.15) return { color: Colors.muted, label: 'Neutral' };
  if (v < 0.5) return { color: '#fbbf24', label: 'Angenehm' };
  return { color: '#f59e0b', label: 'Sehr angenehm' };
}

function MoodOrb({ value }: { value: number }) {
  const { color, label } = valenceColor(value);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: color,
            shadowColor: color,
            transform: [{ scale }],
          },
        ]}
      />
      <Text style={styles.orbLabel}>{label}</Text>
    </View>
  );
}

export function MentalHealthSection() {
  const [checkins, setCheckins] = useState<MentalHealthCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [valence, setValence] = useState(0);
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [influenceTags, setInfluenceTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api.mentalHealth.list().then((d) => {
      setCheckins(d);
      setLoading(false);
    });
  }

  useEffect(load, []);

  function toggle(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  async function save() {
    setSaving(true);
    try {
      await api.mentalHealth.create({ type: 'emotion', valence, emotionTags, influenceTags, note });
      setValence(0);
      setEmotionTags([]);
      setInfluenceTags([]);
      setNote('');
      load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  const trend = [...checkins].reverse().slice(-30);

  return (
    <View style={{ gap: 16 }}>
      <Card title="Check-in" subtitle="Wie fühlst du dich gerade?">
        <View style={{ alignItems: 'center', gap: 16 }}>
          <MoodOrb value={valence} />
          <View style={styles.stepsRow}>
            {VALENCE_STEPS.map((v) => (
              <Pressable
                key={v}
                onPress={() => setValence(v)}
                style={[styles.step, { backgroundColor: valenceColor(v).color }, valence === v && styles.stepActive]}
              />
            ))}
          </View>
          <View style={styles.stepsLabels}>
            <Text style={styles.stepsLabelText}>Sehr unangenehm</Text>
            <Text style={styles.stepsLabelText}>Sehr angenehm</Text>
          </View>

          <View style={{ width: '100%', gap: 12 }}>
            <View>
              <Text style={styles.sectionLabel}>Welche Gefühle beschreiben es am besten?</Text>
              <View style={styles.tagWrap}>
                {EMOTION_TAGS.map((tag) => (
                  <Pressable key={tag} onPress={() => toggle(emotionTags, setEmotionTags, tag)} style={[styles.pill, emotionTags.includes(tag) && styles.pillActive]}>
                    <Text style={[styles.pillText, emotionTags.includes(tag) && styles.pillTextActive]}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.sectionLabel}>Was beeinflusst dich gerade am meisten?</Text>
              <View style={styles.tagWrap}>
                {INFLUENCE_TAGS.map((tag) => (
                  <Pressable key={tag} onPress={() => toggle(influenceTags, setInfluenceTags, tag)} style={[styles.pill, influenceTags.includes(tag) && styles.pillActive]}>
                    <Text style={[styles.pillText, influenceTags.includes(tag) && styles.pillTextActive]}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.notesInput}
              value={note}
              onChangeText={setNote}
              placeholder="Optional: was steckt dahinter?"
              placeholderTextColor={Colors.muted}
              multiline
            />

            <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{saving ? 'Speichern…' : 'Check-in speichern'}</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {trend.length > 1 && (
        <Card title="Verlauf" subtitle="Valenz der letzten Check-ins (-1 bis 1)">
          <TrendChart labels={trend.map((c) => c.timestamp.slice(5, 10))} data={trend.map((c) => c.valence)} color={Colors.accent} decimalPlaces={2} />
        </Card>
      )}

      {checkins.length > 0 && (
        <Card title="Letzte Check-ins">
          <View style={{ gap: 8 }}>
            {checkins.slice(0, 10).map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={styles.historyDate}>{new Date(c.timestamp).toLocaleDateString('de-DE')}</Text>
                <Text style={styles.historyTags}>{c.emotionTags.join(', ') || '–'}</Text>
                <Text style={styles.historyValence}>{c.valence.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    width: 130,
    height: 130,
    borderRadius: 65,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  orbLabel: { color: Colors.foreground, fontSize: 14, fontWeight: '600' },
  stepsRow: { flexDirection: 'row', gap: 8 },
  step: { width: 22, height: 22, borderRadius: 11, opacity: 0.55 },
  stepActive: { opacity: 1, borderWidth: 2, borderColor: Colors.foreground },
  stepsLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  stepsLabelText: { fontSize: 10, color: Colors.muted },
  sectionLabel: { fontSize: 12, color: Colors.muted, marginBottom: 8 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  pillActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  pillText: { color: Colors.muted, fontSize: 12 },
  pillTextActive: { color: Colors.accent, fontWeight: '600' },
  notesInput: { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.foreground, fontSize: 13, minHeight: 60, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '600', fontSize: 14 },
  historyDate: { color: Colors.muted, fontSize: 12, width: 70 },
  historyTags: { color: Colors.foreground, fontSize: 12, flex: 1 },
  historyValence: { color: Colors.muted, fontSize: 12 },
});

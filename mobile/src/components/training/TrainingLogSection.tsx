import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { TrainingLogEntry } from '@/lib/types';

const SCALE = Array.from({ length: 11 }, (_, i) => i); // 0..10

function ScalePicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={styles.scaleRow}>
      {SCALE.map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} style={[styles.scaleDot, value === n && styles.scaleDotActive]}>
          <Text style={[styles.scaleDotText, value === n && styles.scaleDotTextActive]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function TrainingLogSection({ activityId, date }: { activityId: number; date: string }) {
  const [entry, setEntry] = useState<Partial<TrainingLogEntry>>({ pain: [], injury: false, soreness: null, rpe: null, notes: '' });
  const [initial, setInitial] = useState<Partial<TrainingLogEntry>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newBodyPart, setNewBodyPart] = useState('');

  useEffect(() => {
    api.trainingLog.get(activityId).then((existing) => {
      const data = existing ?? { pain: [], injury: false, soreness: null, rpe: null, notes: '' };
      setEntry(data);
      setInitial(data);
      setLoaded(true);
    });
  }, [activityId]);

  function addPain() {
    if (!newBodyPart.trim()) return;
    setEntry((e) => ({ ...e, pain: [...(e.pain ?? []), { bodyPart: newBodyPart.trim(), intensity: 5 }] }));
    setNewBodyPart('');
  }

  function updatePainIntensity(idx: number, intensity: number) {
    setEntry((e) => ({ ...e, pain: (e.pain ?? []).map((p, i) => (i === idx ? { ...p, intensity } : p)) }));
  }

  function removePain(idx: number) {
    setEntry((e) => ({ ...e, pain: (e.pain ?? []).filter((_, i) => i !== idx) }));
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await api.trainingLog.save(activityId, { ...entry, date });
      setEntry(saved);
      setInitial(saved);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  const dirty = JSON.stringify(entry) !== JSON.stringify(initial);

  return (
    <Card title="Trainingsprotokoll" subtitle="Schmerzen, Muskelkater, Belastungsempfinden">
      <View style={{ gap: 16 }}>
        <View>
          <Text style={styles.label}>Schmerzen</Text>
          {(entry.pain ?? []).map((p, i) => (
            <View key={`${p.bodyPart}-${i}`} style={styles.painRow}>
              <Text style={styles.painLabel}>{p.bodyPart}</Text>
              <View style={{ flex: 1 }}>
                <ScalePicker value={p.intensity} onChange={(v) => updatePainIntensity(i, v)} />
              </View>
              <Pressable onPress={() => removePain(i)}>
                <X size={14} color={Colors.negative} />
              </Pressable>
            </View>
          ))}
          <View style={styles.addPainRow}>
            <TextInput
              style={styles.addPainInput}
              placeholder="Körperstelle (z.B. Knie rechts)…"
              placeholderTextColor={Colors.muted}
              value={newBodyPart}
              onChangeText={setNewBodyPart}
              onSubmitEditing={addPain}
            />
            <Pressable onPress={addPain} style={styles.addPainBtn}>
              <Plus size={16} color="#000" />
            </Pressable>
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Verletzung markieren</Text>
          <Switch
            value={entry.injury ?? false}
            onValueChange={(v) => setEntry((e) => ({ ...e, injury: v }))}
            trackColor={{ true: Colors.accent, false: Colors.border }}
          />
        </View>

        <View>
          <Text style={styles.label}>Muskelkater (0 = keiner, 10 = extrem)</Text>
          <ScalePicker value={entry.soreness ?? null} onChange={(v) => setEntry((e) => ({ ...e, soreness: v }))} />
        </View>

        <View>
          <Text style={styles.label}>RPE – subjektives Belastungsempfinden (0 = keine, 10 = maximal)</Text>
          <ScalePicker value={entry.rpe ?? null} onChange={(v) => setEntry((e) => ({ ...e, rpe: v }))} />
        </View>

        <View>
          <Text style={styles.label}>Notizen</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Wie hat sich die Einheit angefühlt?"
            placeholderTextColor={Colors.muted}
            multiline
            value={entry.notes ?? ''}
            onChangeText={(v) => setEntry((e) => ({ ...e, notes: v }))}
          />
        </View>

        {dirty && (
          <Pressable onPress={save} disabled={saving} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{saving ? 'Speichern…' : 'Speichern'}</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: Colors.muted, marginBottom: 8 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  scaleDotActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  scaleDotText: { color: Colors.muted, fontSize: 12 },
  scaleDotTextActive: { color: '#000', fontWeight: '700' },
  painRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  painLabel: { color: Colors.foreground, fontSize: 13, width: 90 },
  addPainRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addPainInput: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.foreground,
    fontSize: 13,
  },
  addPainBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notesInput: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.foreground,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveButton: { backgroundColor: Colors.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveButtonText: { color: '#000', fontWeight: '600', fontSize: 13 },
});

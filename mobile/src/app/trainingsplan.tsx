import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CalendarRange, Dumbbell, LineChart, Plus, Trash2, Trophy, X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { TrendChart } from '@/components/charts/TrendChart';
import { api } from '@/lib/api';
import type { Benchmark, CompetitionResult, PlannedSession, StrengthExerciseLog, StrengthSession } from '@/lib/types';

const BENCHMARK_PRESETS = [
  { name: 'Ergo 1500m', kind: 'time' as const, unit: 's', lowerIsBetter: true },
  { name: 'Ergo 2000m', kind: 'time' as const, unit: 's', lowerIsBetter: true },
  { name: '30m Sprint', kind: 'time' as const, unit: 's', lowerIsBetter: true },
  { name: 'Kniebeuge 1RM', kind: 'weight' as const, unit: 'kg', lowerIsBetter: false },
  { name: 'Bankdrücken 1RM', kind: 'weight' as const, unit: 'kg', lowerIsBetter: false },
];

export default function TrainingsplanScreen() {
  const [sessions, setSessions] = useState<PlannedSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [strengthSessions, setStrengthSessions] = useState<StrengthSession[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);

  const [planModal, setPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ date: '', title: '', sportType: '' });

  const [strengthModal, setStrengthModal] = useState(false);
  const [strengthDate, setStrengthDate] = useState('');
  const [exercises, setExercises] = useState<StrengthExerciseLog[]>([{ name: '', sets: [{ weightKg: null, reps: null }] }]);

  const [entryModalId, setEntryModalId] = useState<string | null>(null);
  const [entryValue, setEntryValue] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, c, st, b] = await Promise.all([
        api.plannedSessions.list(),
        api.competitions.list(),
        api.strength.list(),
        api.benchmarks.list(),
      ]);
      setSessions(s);
      setCompetitions(c);
      setStrengthSessions(st);
      setBenchmarks(b);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function submitPlan() {
    const created = await api.plannedSessions.create(planForm);
    setSessions((s) => [...s, created]);
    setPlanModal(false);
    setPlanForm({ date: '', title: '', sportType: '' });
  }

  async function removePlan(id: string) {
    await api.plannedSessions.remove(id);
    setSessions((s) => s.filter((x) => x.id !== id));
  }

  function updateExerciseName(i: number, name: string) {
    setExercises((ex) => ex.map((e, idx) => (idx === i ? { ...e, name } : e)));
  }
  function updateSet(exIdx: number, setIdx: number, field: 'weightKg' | 'reps', value: string) {
    setExercises((ex) =>
      ex.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.map((s, si) => (si === setIdx ? { ...s, [field]: value ? Number(value) : null } : s)) } : e
      )
    );
  }
  function addSet(exIdx: number) {
    setExercises((ex) => ex.map((e, i) => (i === exIdx ? { ...e, sets: [...e.sets, { weightKg: null, reps: null }] } : e)));
  }
  function addExercise() {
    setExercises((ex) => [...ex, { name: '', sets: [{ weightKg: null, reps: null }] }]);
  }

  async function submitStrength() {
    const created = await api.strength.create({ date: strengthDate, title: 'Krafttraining', exercises: exercises.filter((e) => e.name) });
    setStrengthSessions((s) => [created, ...s]);
    setStrengthModal(false);
    setExercises([{ name: '', sets: [{ weightKg: null, reps: null }] }]);
    setStrengthDate('');
  }

  async function removeStrength(id: string) {
    await api.strength.remove(id);
    setStrengthSessions((s) => s.filter((x) => x.id !== id));
  }

  async function addPreset(preset: (typeof BENCHMARK_PRESETS)[number]) {
    const created = await api.benchmarks.create(preset);
    setBenchmarks((b) => [...b, created]);
  }

  async function removeBenchmark(id: string) {
    await api.benchmarks.remove(id);
    setBenchmarks((b) => b.filter((x) => x.id !== id));
  }

  async function submitEntry() {
    if (!entryModalId || !entryValue) return;
    const updated = await api.benchmarks.addEntry(entryModalId, { date: new Date().toISOString().slice(0, 10), value: Number(entryValue) });
    setBenchmarks((b) => b.map((x) => (x.id === entryModalId ? updated : x)));
    setEntryModalId(null);
    setEntryValue('');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const upcoming = [
    ...sessions.filter((s) => !s.done).map((s) => ({ kind: 'session' as const, date: s.date, session: s })),
    ...competitions.filter((c) => c.status === 'planned').map((c) => ({ kind: 'competition' as const, date: c.date, comp: c })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}><CalendarRange size={12} color={Colors.muted} /> Geplant</Text>
        <Pressable onPress={() => setPlanModal(true)} style={styles.addBtn}>
          <Plus size={13} color="#000" />
        </Pressable>
      </View>
      {upcoming.length === 0 && <Text style={styles.emptyText}>Keine geplanten Einheiten oder Wettkämpfe.</Text>}
      {upcoming.map((u) => (
        <Card key={u.kind + (u.kind === 'session' ? u.session.id : u.comp.id)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {u.kind === 'competition' ? <Trophy size={15} color={Colors.accent} /> : <CalendarRange size={15} color={Colors.accent} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{u.kind === 'competition' ? u.comp.name : u.session.title}</Text>
              <Text style={styles.itemMeta}>{u.date}</Text>
            </View>
            {u.kind === 'session' && (
              <Pressable onPress={() => removePlan(u.session.id)}>
                <Trash2 size={15} color={Colors.muted} />
              </Pressable>
            )}
          </View>
        </Card>
      ))}

      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Text style={styles.sectionLabel}><Dumbbell size={12} color={Colors.muted} /> Krafttraining</Text>
        <Pressable onPress={() => setStrengthModal(true)} style={styles.addBtn}>
          <Plus size={13} color="#000" />
        </Pressable>
      </View>
      {strengthSessions.length === 0 && <Text style={styles.emptyText}>Noch keine Kraftsessions.</Text>}
      {strengthSessions.map((s) => (
        <Card key={s.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.itemTitle}>{s.title}</Text>
              <Text style={styles.itemMeta}>{s.date}</Text>
            </View>
            <Pressable onPress={() => removeStrength(s.id)}>
              <Trash2 size={15} color={Colors.muted} />
            </Pressable>
          </View>
          {s.exercises.map((ex, i) => (
            <Text key={i} style={styles.exerciseLine}>
              {ex.name}: {ex.sets.map((set) => `${set.weightKg ?? '–'}kg×${set.reps ?? '–'}`).join(', ')}
            </Text>
          ))}
        </Card>
      ))}

      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Text style={styles.sectionLabel}><LineChart size={12} color={Colors.muted} /> Bestwerte</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        {BENCHMARK_PRESETS.map((p) => (
          <Pressable key={p.name} onPress={() => addPreset(p)} style={styles.presetChip}>
            <Text style={styles.presetChipText}>+ {p.name}</Text>
          </Pressable>
        ))}
      </View>
      {benchmarks.map((b) => (
        <Card key={b.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.itemTitle}>{b.name}</Text>
              <Text style={styles.itemMeta}>
                {b.entries.length} Einträge{b.entries.length > 0 ? ` · zuletzt ${b.entries[b.entries.length - 1].value}${b.unit}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => { setEntryModalId(b.id); setEntryValue(''); }}>
                <Plus size={16} color={Colors.accent} />
              </Pressable>
              <Pressable onPress={() => removeBenchmark(b.id)}>
                <Trash2 size={15} color={Colors.muted} />
              </Pressable>
            </View>
          </View>
          {b.entries.length >= 2 && (
            <TrendChart
              labels={b.entries.map((e) => e.date.slice(5))}
              data={b.entries.map((e) => e.value)}
              color={Colors.accent}
              decimalPlaces={1}
            />
          )}
        </Card>
      ))}

      <Modal visible={planModal} animationType="slide" transparent onRequestClose={() => setPlanModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Einheit planen</Text>
              <Pressable onPress={() => setPlanModal(false)}><X size={20} color={Colors.muted} /></Pressable>
            </View>
            <TextInput style={styles.input} placeholder="Datum (YYYY-MM-DD)" placeholderTextColor={Colors.muted} value={planForm.date} onChangeText={(t) => setPlanForm({ ...planForm, date: t })} />
            <TextInput style={styles.input} placeholder="Titel" placeholderTextColor={Colors.muted} value={planForm.title} onChangeText={(t) => setPlanForm({ ...planForm, title: t })} />
            <TextInput style={styles.input} placeholder="Sportart" placeholderTextColor={Colors.muted} value={planForm.sportType} onChangeText={(t) => setPlanForm({ ...planForm, sportType: t })} />
            <Pressable style={styles.submitButton} onPress={submitPlan}><Text style={styles.submitButtonText}>Speichern</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={strengthModal} animationType="slide" transparent onRequestClose={() => setStrengthModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Krafttraining loggen</Text>
              <Pressable onPress={() => setStrengthModal(false)}><X size={20} color={Colors.muted} /></Pressable>
            </View>
            <TextInput style={styles.input} placeholder="Datum (YYYY-MM-DD)" placeholderTextColor={Colors.muted} value={strengthDate} onChangeText={setStrengthDate} />
            <ScrollView style={{ maxHeight: 300 }}>
              {exercises.map((ex, exIdx) => (
                <View key={exIdx} style={{ marginBottom: 10, gap: 6 }}>
                  <TextInput style={styles.input} placeholder="Übung" placeholderTextColor={Colors.muted} value={ex.name} onChangeText={(t) => updateExerciseName(exIdx, t)} />
                  {ex.sets.map((s, setIdx) => (
                    <View key={setIdx} style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput style={[styles.input, { flex: 1 }]} placeholder="kg" keyboardType="numeric" placeholderTextColor={Colors.muted} value={s.weightKg?.toString() ?? ''} onChangeText={(t) => updateSet(exIdx, setIdx, 'weightKg', t)} />
                      <TextInput style={[styles.input, { flex: 1 }]} placeholder="Wdh." keyboardType="numeric" placeholderTextColor={Colors.muted} value={s.reps?.toString() ?? ''} onChangeText={(t) => updateSet(exIdx, setIdx, 'reps', t)} />
                    </View>
                  ))}
                  <Pressable onPress={() => addSet(exIdx)}><Text style={{ color: Colors.accent, fontSize: 13 }}>+ Satz</Text></Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={addExercise}><Text style={{ color: Colors.accent, fontSize: 13, marginBottom: 8 }}>+ Übung</Text></Pressable>
            <Pressable style={styles.submitButton} onPress={submitStrength}><Text style={styles.submitButtonText}>Speichern</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!entryModalId} animationType="slide" transparent onRequestClose={() => setEntryModalId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wert eintragen</Text>
              <Pressable onPress={() => setEntryModalId(null)}><X size={20} color={Colors.muted} /></Pressable>
            </View>
            <TextInput style={styles.input} placeholder="Wert" keyboardType="numeric" placeholderTextColor={Colors.muted} value={entryValue} onChangeText={setEntryValue} />
            <Pressable style={styles.submitButton} onPress={submitEntry}><Text style={styles.submitButtonText}>Eintragen</Text></Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { color: Colors.muted, fontSize: 13 },
  addBtn: { backgroundColor: Colors.accent, borderRadius: 8, padding: 6 },
  itemTitle: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  itemMeta: { fontSize: 12, color: Colors.muted, marginTop: 1 },
  exerciseLine: { fontSize: 12, color: Colors.muted, marginTop: 4 },
  presetChip: { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  presetChipText: { fontSize: 12, color: Colors.foreground },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 8, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.foreground },
  input: { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.foreground, fontSize: 14 },
  submitButton: { backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  submitButtonText: { color: '#000', fontWeight: '600', fontSize: 14 },
});

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { StrengthExerciseLog, StrengthSession } from '@/lib/types';

export function StrengthLogSection({
  activityId,
  date,
  defaultTitle,
}: {
  activityId: number;
  date: string;
  defaultTitle: string;
}) {
  const [session, setSession] = useState<StrengthSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [exercises, setExercises] = useState<StrengthExerciseLog[]>([
    { name: '', sets: [{ weightKg: null, reps: null }] },
  ]);

  useEffect(() => {
    api.strength.list().then((sessions) => {
      setSession(sessions.find((s) => s.activityId === activityId) ?? null);
      setLoaded(true);
    });
  }, [activityId]);

  function updateExercise(i: number, name: string) {
    setExercises((ex) => ex.map((e, idx) => (idx === i ? { ...e, name } : e)));
  }
  function updateSet(exIdx: number, setIdx: number, field: 'weightKg' | 'reps', value: string) {
    setExercises((ex) =>
      ex.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.map((s, si) => (si === setIdx ? { ...s, [field]: value ? Number(value) : null } : s)) }
          : e
      )
    );
  }
  function addSet(exIdx: number) {
    setExercises((ex) => ex.map((e, i) => (i === exIdx ? { ...e, sets: [...e.sets, { weightKg: null, reps: null }] } : e)));
  }
  function addExercise() {
    setExercises((ex) => [...ex, { name: '', sets: [{ weightKg: null, reps: null }] }]);
  }
  function removeExercise(i: number) {
    setExercises((ex) => ex.filter((_, idx) => idx !== i));
  }

  async function submit() {
    const created = await api.strength.create({
      date,
      title: defaultTitle,
      activityId,
      exercises: exercises.filter((e) => e.name),
    });
    setSession(created);
  }

  function toggleExpanded(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function remove() {
    if (!session) return;
    await api.strength.remove(session.id);
    setSession(null);
  }

  if (!loaded) return null;

  return (
    <Card title="Krafttraining protokollieren">
      {session ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.meta}>{session.exercises.length} Übungen protokolliert</Text>
            <Pressable onPress={remove}>
              <Trash2 size={15} color={Colors.muted} />
            </Pressable>
          </View>
          {session.exercises.map((ex, i) => {
            const isOpen = expanded.has(i);
            return (
              <View key={i} style={styles.exerciseTable}>
                <Pressable style={styles.exerciseTableHeaderRow} onPress={() => toggleExpanded(i)}>
                  <Text style={styles.exerciseTableHeader}>{ex.name}</Text>
                  <View style={styles.exerciseTableHeaderRight}>
                    <Text style={styles.setCountText}>{ex.sets.length} Sätze</Text>
                    {isOpen ? <ChevronUp size={15} color={Colors.muted} /> : <ChevronDown size={15} color={Colors.muted} />}
                  </View>
                </Pressable>
                {isOpen && (
                  <>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'left' }]}>Satz</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Wiederholungen</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>kg</Text>
                    </View>
                    {ex.sets.map((s, si) => (
                      <View key={si} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'left' }]}>{si + 1}</Text>
                        <Text style={[styles.tableCell, { flex: 2 }]}>{s.reps ?? '–'}</Text>
                        <Text style={[styles.tableCell, { flex: 1 }]}>{s.weightKg ?? '–'}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {exercises.map((ex, exIdx) => (
            <View key={exIdx} style={styles.exerciseBox}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Übung (z.B. Kniebeuge)"
                  placeholderTextColor={Colors.muted}
                  value={ex.name}
                  onChangeText={(t) => updateExercise(exIdx, t)}
                />
                <Pressable onPress={() => removeExercise(exIdx)}>
                  <Trash2 size={15} color={Colors.muted} />
                </Pressable>
              </View>
              {ex.sets.map((s, setIdx) => (
                <View key={setIdx} style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="kg"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.muted}
                    value={s.weightKg?.toString() ?? ''}
                    onChangeText={(t) => updateSet(exIdx, setIdx, 'weightKg', t)}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Wdh."
                    keyboardType="numeric"
                    placeholderTextColor={Colors.muted}
                    value={s.reps?.toString() ?? ''}
                    onChangeText={(t) => updateSet(exIdx, setIdx, 'reps', t)}
                  />
                </View>
              ))}
              <Pressable onPress={() => addSet(exIdx)}>
                <Text style={styles.link}>+ Satz hinzufügen</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addExercise}>
            <Text style={styles.link}>+ Übung hinzufügen</Text>
          </Pressable>
          <Pressable style={styles.submitButton} onPress={submit}>
            <Text style={styles.submitButtonText}>Session speichern</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: 13, color: Colors.muted },
  exerciseBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10, gap: 8 },
  exerciseTable: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden' },
  exerciseTableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exerciseTableHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setCountText: { fontSize: 12, color: Colors.muted },
  exerciseTableHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6 },
  tableHeaderCell: { fontSize: 11, color: Colors.muted, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tableCell: { fontSize: 13, color: Colors.foreground, textAlign: 'right' },
  input: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.foreground,
    fontSize: 13,
  },
  link: { color: Colors.accent, fontSize: 13 },
  submitButton: { backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitButtonText: { color: '#000', fontWeight: '600', fontSize: 14 },
});

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
import { Plus, Trash2, Target, X, Pencil, CheckCircle2, Circle } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useForceRefresh } from '@/lib/useForceRefresh';
import { formatDate, parseGermanDateInput } from '@/lib/format';
import type { Goal } from '@/lib/types';

const CATEGORY_LABELS: Record<Goal['category'], string> = {
  wettkampf: 'Wettkampf',
  leistung: 'Leistung',
  kraft: 'Kraft',
  umfang: 'Umfang',
  sonstiges: 'Sonstiges',
};

const emptyForm = {
  title: '',
  category: 'leistung' as Goal['category'],
  targetDate: '',
  metricLabel: '',
  targetValue: '',
  unit: '',
  currentValue: '',
  notes: '',
};

function computeProgress(goal: Goal): number | null {
  if (goal.currentValue === null || goal.targetValue === null || goal.targetValue === 0) return null;
  const lowerIsBetter = goal.unit.toLowerCase().includes('sekunde') || goal.metricLabel.toLowerCase().includes('platz');
  const ratio = lowerIsBetter ? goal.targetValue / goal.currentValue : goal.currentValue / goal.targetValue;
  return Math.max(0, Math.min(1, ratio));
}

function goalToForm(goal: Goal) {
  return {
    title: goal.title,
    category: goal.category,
    targetDate: goal.targetDate,
    metricLabel: goal.metricLabel,
    targetValue: goal.targetValue !== null ? String(goal.targetValue) : '',
    unit: goal.unit,
    currentValue: goal.currentValue !== null ? String(goal.currentValue) : '',
    notes: goal.notes,
  };
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setGoals(await api.goals.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const { refreshing, onRefresh } = useForceRefresh(load);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalVisible(true);
  }

  function openEdit(goal: Goal) {
    setEditingId(goal.id);
    setForm(goalToForm(goal));
    setModalVisible(true);
  }

  async function submit() {
    const payload = {
      title: form.title,
      category: form.category,
      targetDate: parseGermanDateInput(form.targetDate),
      metricLabel: form.metricLabel,
      targetValue: form.targetValue ? Number(form.targetValue) : null,
      unit: form.unit,
      currentValue: form.currentValue ? Number(form.currentValue) : null,
      notes: form.notes,
    };

    if (editingId) {
      const updated = await api.goals.update({ ...payload, id: editingId });
      setGoals((g) => g.map((goal) => (goal.id === editingId ? updated : goal)));
    } else {
      const created = await api.goals.create(payload);
      setGoals((g) => [...g, created]);
    }

    setModalVisible(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function remove(id: string) {
    await api.goals.remove(id);
    setGoals((g) => g.filter((goal) => goal.id !== id));
  }

  async function toggleAchieved(goal: Goal) {
    const updated = await api.goals.update({ id: goal.id, achieved: !goal.achieved });
    setGoals((g) => g.map((x) => (x.id === goal.id ? updated : x)));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const activeGoals = goals.filter((g) => !g.achieved);
  const achievedGoals = goals.filter((g) => g.achieved);

  function renderGoal(goal: Goal) {
    const progress = computeProgress(goal);
    return (
      <Card key={goal.id} style={goal.achieved ? { opacity: 0.7 } : undefined}>
        <View style={styles.goalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Pressable onPress={() => toggleAchieved(goal)}>
              {goal.achieved ? (
                <CheckCircle2 size={18} color={Colors.positive} />
              ) : (
                <Circle size={18} color={Colors.muted} />
              )}
            </Pressable>
            <Text style={[styles.goalTitle, goal.achieved && { textDecorationLine: 'line-through' }]}>{goal.title}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Pressable onPress={() => openEdit(goal)}>
              <Pencil size={16} color={Colors.muted} />
            </Pressable>
            <Pressable onPress={() => remove(goal.id)}>
              <Trash2 size={16} color={Colors.muted} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.goalMeta}>
          {CATEGORY_LABELS[goal.category]} · bis {formatDate(goal.targetDate)}
        </Text>
        {goal.targetValue !== null && (
          <Text style={styles.goalValue}>
            {goal.metricLabel}: {goal.currentValue ?? '–'} / {goal.targetValue} {goal.unit}
          </Text>
        )}
        {progress !== null && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
        {!!goal.notes && <Text style={styles.goalNotes}>{goal.notes}</Text>}
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        <Text style={styles.sectionLabel}>Aktuelle Ziele</Text>
        {activeGoals.length === 0 && <Text style={styles.emptyText}>Keine aktiven Ziele.</Text>}
        {activeGoals.map(renderGoal)}

        {achievedGoals.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Erreichte Ziele</Text>
            {achievedGoals.map(renderGoal)}
          </>
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={openCreate}>
        <Plus size={22} color="#000" />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Ziel bearbeiten' : 'Neues Ziel'}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} color={Colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: '80%' }}>
              <View style={{ gap: 10 }}>
                <TextInput style={styles.input} placeholder="Titel" placeholderTextColor={Colors.muted} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />
                <View style={styles.categoryRow}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <Pressable
                      key={k}
                      onPress={() => setForm({ ...form, category: k as Goal['category'] })}
                      style={[styles.categoryChip, form.category === k && styles.categoryChipActive]}
                    >
                      <Text style={[styles.categoryChipText, form.category === k && styles.categoryChipTextActive]}>{v}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder="Zieldatum (TT.MM.JJJJ)" placeholderTextColor={Colors.muted} value={form.targetDate} onChangeText={(t) => setForm({ ...form, targetDate: t })} />
                <TextInput style={styles.input} placeholder="Kennzahl" placeholderTextColor={Colors.muted} value={form.metricLabel} onChangeText={(t) => setForm({ ...form, metricLabel: t })} />
                <TextInput style={styles.input} placeholder="Zielwert" placeholderTextColor={Colors.muted} keyboardType="numeric" value={form.targetValue} onChangeText={(t) => setForm({ ...form, targetValue: t })} />
                <TextInput style={styles.input} placeholder="Aktueller Wert (optional)" placeholderTextColor={Colors.muted} keyboardType="numeric" value={form.currentValue} onChangeText={(t) => setForm({ ...form, currentValue: t })} />
                <TextInput style={styles.input} placeholder="Einheit" placeholderTextColor={Colors.muted} value={form.unit} onChangeText={(t) => setForm({ ...form, unit: t })} />
                <TextInput style={styles.input} placeholder="Notizen" placeholderTextColor={Colors.muted} value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} />
              </View>
            </ScrollView>
            <Pressable style={styles.submitButton} onPress={submit}>
              <Text style={styles.submitButtonText}>{editingId ? 'Speichern' : 'Anlegen'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { color: Colors.muted, fontSize: 13 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalTitle: { fontSize: 14, fontWeight: '600', color: Colors.foreground, flexShrink: 1 },
  goalMeta: { fontSize: 12, color: Colors.muted, marginTop: 4 },
  goalValue: { fontSize: 13, color: Colors.foreground, marginTop: 8 },
  goalNotes: { fontSize: 12, color: Colors.muted, marginTop: 8 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceRaised, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceRaised, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  categoryChipText: { fontSize: 12, color: Colors.foreground },
  categoryChipTextActive: { color: '#000', fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.foreground },
  input: { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.foreground, fontSize: 14 },
  submitButton: { backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  submitButtonText: { color: '#000', fontWeight: '600', fontSize: 14 },
});

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
import { Plus, Trash2, Target, X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { Goal } from '@/lib/types';

const CATEGORY_LABELS: Record<Goal['category'], string> = {
  wettkampf: 'Wettkampf',
  leistung: 'Leistung',
  kraft: 'Kraft',
  umfang: 'Umfang',
  sonstiges: 'Sonstiges',
};

function computeProgress(goal: Goal): number | null {
  if (goal.currentValue === null || goal.targetValue === null || goal.targetValue === 0) return null;
  const lowerIsBetter = goal.unit.toLowerCase().includes('sekunde') || goal.metricLabel.toLowerCase().includes('platz');
  const ratio = lowerIsBetter ? goal.targetValue / goal.currentValue : goal.currentValue / goal.targetValue;
  return Math.max(0, Math.min(1, ratio));
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ title: '', targetDate: '', metricLabel: '', targetValue: '', unit: '', notes: '' });

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

  async function submit() {
    const created = await api.goals.create({
      title: form.title,
      category: 'leistung',
      targetDate: form.targetDate,
      metricLabel: form.metricLabel,
      targetValue: form.targetValue ? Number(form.targetValue) : null,
      unit: form.unit,
      notes: form.notes,
    });
    setGoals((g) => [...g, created]);
    setModalVisible(false);
    setForm({ title: '', targetDate: '', metricLabel: '', targetValue: '', unit: '', notes: '' });
  }

  async function remove(id: string) {
    await api.goals.remove(id);
    setGoals((g) => g.filter((goal) => goal.id !== id));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
      >
        {goals.map((goal) => {
          const progress = computeProgress(goal);
          return (
            <Card key={goal.id}>
              <View style={styles.goalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Target size={16} color={Colors.accent} />
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                </View>
                <Pressable onPress={() => remove(goal.id)}>
                  <Trash2 size={16} color={Colors.muted} />
                </Pressable>
              </View>
              <Text style={styles.goalMeta}>
                {CATEGORY_LABELS[goal.category]} · bis {goal.targetDate}
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
        })}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={22} color="#000" />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Neues Ziel</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} color={Colors.muted} />
              </Pressable>
            </View>
            <TextInput style={styles.input} placeholder="Titel" placeholderTextColor={Colors.muted} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />
            <TextInput style={styles.input} placeholder="Zieldatum (YYYY-MM-DD)" placeholderTextColor={Colors.muted} value={form.targetDate} onChangeText={(t) => setForm({ ...form, targetDate: t })} />
            <TextInput style={styles.input} placeholder="Kennzahl" placeholderTextColor={Colors.muted} value={form.metricLabel} onChangeText={(t) => setForm({ ...form, metricLabel: t })} />
            <TextInput style={styles.input} placeholder="Zielwert" placeholderTextColor={Colors.muted} keyboardType="numeric" value={form.targetValue} onChangeText={(t) => setForm({ ...form, targetValue: t })} />
            <TextInput style={styles.input} placeholder="Einheit" placeholderTextColor={Colors.muted} value={form.unit} onChangeText={(t) => setForm({ ...form, unit: t })} />
            <TextInput style={styles.input} placeholder="Notizen" placeholderTextColor={Colors.muted} value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} />
            <Pressable style={styles.submitButton} onPress={submit}>
              <Text style={styles.submitButtonText}>Speichern</Text>
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
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalTitle: { fontSize: 14, fontWeight: '600', color: Colors.foreground, flexShrink: 1 },
  goalMeta: { fontSize: 12, color: Colors.muted, marginTop: 4 },
  goalValue: { fontSize: 13, color: Colors.foreground, marginTop: 8 },
  goalNotes: { fontSize: 12, color: Colors.muted, marginTop: 8 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceRaised, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 4 },
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
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.foreground },
  input: { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.foreground, fontSize: 14 },
  submitButton: { backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  submitButtonText: { color: '#000', fontWeight: '600', fontSize: 14 },
});

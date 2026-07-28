import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Plus, Trash2, Trophy, X, Sparkles, CalendarClock, ClipboardCheck } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { CompetitionResult } from '@/lib/types';

const emptyPlanForm = { name: '', date: '', location: '', boatClass: '', crew: '', goal: '' };
const emptyResultForm = { result: '', placement: '', avgHeartRate: '', notes: '' };

export default function CompetitionsScreen() {
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [resultModalId, setResultModalId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [resultForm, setResultForm] = useState(emptyResultForm);

  const load = useCallback(async () => {
    try {
      setCompetitions(await api.competitions.list());
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
    const created = await api.competitions.create({ ...planForm, status: 'planned' });
    setCompetitions((c) => [created, ...c]);
    setPlanModalVisible(false);
    setPlanForm(emptyPlanForm);
  }

  async function submitResult(id: string) {
    const updated = await api.competitions.update({
      id,
      result: resultForm.result,
      placement: resultForm.placement ? Number(resultForm.placement) : null,
      avgHeartRate: resultForm.avgHeartRate ? Number(resultForm.avgHeartRate) : null,
      notes: resultForm.notes,
    });
    setCompetitions((c) => c.map((comp) => (comp.id === id ? updated : comp)));
    setResultModalId(null);
    setResultForm(emptyResultForm);
  }

  async function remove(id: string) {
    await api.competitions.remove(id);
    setCompetitions((c) => c.filter((comp) => comp.id !== id));
  }

  async function analyze(id: string) {
    setAnalyzingId(id);
    try {
      const updated = await api.competitions.analyze(id);
      setCompetitions((c) => c.map((comp) => (comp.id === id ? updated : comp)));
    } catch (e) {
      Alert.alert('Analyse fehlgeschlagen', e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setAnalyzingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const planned = competitions.filter((c) => c.status === 'planned').sort((a, b) => a.date.localeCompare(b.date));
  const completed = competitions.filter((c) => c.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
      >
        <Text style={styles.sectionLabel}>
          <CalendarClock size={12} color={Colors.muted} /> Anstehend
        </Text>
        {planned.length === 0 && <Text style={styles.emptyText}>Keine geplanten Wettkämpfe.</Text>}
        {planned.map((c) => (
          <Card key={c.id}>
            <View style={styles.rowHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Trophy size={16} color={Colors.accent} />
                <View>
                  <Text style={styles.compTitle}>{c.name}</Text>
                  <Text style={styles.compMeta}>{c.date} · {c.location} · {c.boatClass}</Text>
                  {!!c.goal && <Text style={styles.compMeta}>Ziel: {c.goal}</Text>}
                </View>
              </View>
              <Pressable onPress={() => remove(c.id)}>
                <Trash2 size={16} color={Colors.muted} />
              </Pressable>
            </View>
            <View style={styles.divider} />
            <Pressable
              onPress={() => { setResultModalId(c.id); setResultForm(emptyResultForm); }}
              style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}
            >
              <ClipboardCheck size={14} color={Colors.accent} />
              <Text style={styles.analyzeLink}>Ergebnis eintragen</Text>
            </Pressable>
          </Card>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Vergangen</Text>
        {completed.length === 0 && <Text style={styles.emptyText}>Noch keine abgeschlossenen Wettkämpfe.</Text>}
        {completed.map((c) => (
          <Card key={c.id}>
            <View style={styles.rowHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Trophy size={16} color={Colors.accent} />
                <View>
                  <Text style={styles.compTitle}>{c.name}</Text>
                  <Text style={styles.compMeta}>{c.date} · {c.location} · {c.boatClass}</Text>
                </View>
              </View>
              <Pressable onPress={() => remove(c.id)}>
                <Trash2 size={16} color={Colors.muted} />
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <Text style={styles.statText}>Ergebnis: {c.result || '–'}</Text>
              <Text style={styles.statText}>Platz: {c.placement ?? '–'}</Text>
            </View>

            {!!c.notes && <Text style={styles.notes}>{c.notes}</Text>}

            <View style={styles.divider} />
            {c.analysis ? (
              <Text style={styles.analysis}>{c.analysis}</Text>
            ) : (
              <Pressable onPress={() => analyze(c.id)} disabled={analyzingId === c.id} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {analyzingId === c.id ? <ActivityIndicator size="small" color={Colors.accent} /> : <Sparkles size={14} color={Colors.accent} />}
                <Text style={styles.analyzeLink}>KI-Analyse erstellen</Text>
              </Pressable>
            )}
          </Card>
        ))}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setPlanModalVisible(true)}>
        <Plus size={22} color="#000" />
      </Pressable>

      <Modal visible={planModalVisible} animationType="slide" transparent onRequestClose={() => setPlanModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wettkampf planen</Text>
              <Pressable onPress={() => setPlanModalVisible(false)}>
                <X size={20} color={Colors.muted} />
              </Pressable>
            </View>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={Colors.muted} value={planForm.name} onChangeText={(t) => setPlanForm({ ...planForm, name: t })} />
            <TextInput style={styles.input} placeholder="Datum (YYYY-MM-DD)" placeholderTextColor={Colors.muted} value={planForm.date} onChangeText={(t) => setPlanForm({ ...planForm, date: t })} />
            <TextInput style={styles.input} placeholder="Ort" placeholderTextColor={Colors.muted} value={planForm.location} onChangeText={(t) => setPlanForm({ ...planForm, location: t })} />
            <TextInput style={styles.input} placeholder="Bootsklasse" placeholderTextColor={Colors.muted} value={planForm.boatClass} onChangeText={(t) => setPlanForm({ ...planForm, boatClass: t })} />
            <TextInput style={styles.input} placeholder="Ziel (z.B. unter 6:50)" placeholderTextColor={Colors.muted} value={planForm.goal} onChangeText={(t) => setPlanForm({ ...planForm, goal: t })} />
            <Pressable style={styles.submitButton} onPress={submitPlan}>
              <Text style={styles.submitButtonText}>Speichern</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!resultModalId} animationType="slide" transparent onRequestClose={() => setResultModalId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ergebnis eintragen</Text>
              <Pressable onPress={() => setResultModalId(null)}>
                <X size={20} color={Colors.muted} />
              </Pressable>
            </View>
            <TextInput style={styles.input} placeholder="Ergebnis (Zeit)" placeholderTextColor={Colors.muted} value={resultForm.result} onChangeText={(t) => setResultForm({ ...resultForm, result: t })} />
            <TextInput style={styles.input} placeholder="Platzierung" placeholderTextColor={Colors.muted} keyboardType="numeric" value={resultForm.placement} onChangeText={(t) => setResultForm({ ...resultForm, placement: t })} />
            <TextInput style={styles.input} placeholder="Ø Herzfrequenz" placeholderTextColor={Colors.muted} keyboardType="numeric" value={resultForm.avgHeartRate} onChangeText={(t) => setResultForm({ ...resultForm, avgHeartRate: t })} />
            <TextInput style={styles.input} placeholder="Notizen" placeholderTextColor={Colors.muted} value={resultForm.notes} onChangeText={(t) => setResultForm({ ...resultForm, notes: t })} />
            <Pressable style={styles.submitButton} onPress={() => resultModalId && submitResult(resultModalId)}>
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
  emptyText: { color: Colors.muted, fontSize: 13, marginBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  compTitle: { fontSize: 14, fontWeight: '600', color: Colors.foreground },
  compMeta: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
  statText: { fontSize: 13, color: Colors.foreground },
  notes: { fontSize: 12, color: Colors.muted, marginTop: 8 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  analysis: { fontSize: 13, color: Colors.foreground, lineHeight: 19 },
  analyzeLink: { fontSize: 13, color: Colors.accent, fontWeight: '500' },
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

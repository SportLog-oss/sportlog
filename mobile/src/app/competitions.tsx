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
import { Plus, Trash2, Trophy, X, Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { CompetitionResult } from '@/lib/types';

export default function CompetitionsScreen() {
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', location: '', boatClass: '', result: '', placement: '', notes: '' });

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

  async function submit() {
    const created = await api.competitions.create({
      name: form.name,
      date: form.date,
      location: form.location,
      boatClass: form.boatClass,
      result: form.result,
      placement: form.placement ? Number(form.placement) : null,
      notes: form.notes,
    });
    setCompetitions((c) => [created, ...c]);
    setModalVisible(false);
    setForm({ name: '', date: '', location: '', boatClass: '', result: '', placement: '', notes: '' });
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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
      >
        {competitions.length === 0 && <Text style={styles.emptyText}>Noch keine Wettkämpfe erfasst.</Text>}
        {competitions.map((c) => (
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

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={22} color="#000" />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wettkampf erfassen</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} color={Colors.muted} />
              </Pressable>
            </View>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={Colors.muted} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
            <TextInput style={styles.input} placeholder="Datum (YYYY-MM-DD)" placeholderTextColor={Colors.muted} value={form.date} onChangeText={(t) => setForm({ ...form, date: t })} />
            <TextInput style={styles.input} placeholder="Ort" placeholderTextColor={Colors.muted} value={form.location} onChangeText={(t) => setForm({ ...form, location: t })} />
            <TextInput style={styles.input} placeholder="Bootsklasse" placeholderTextColor={Colors.muted} value={form.boatClass} onChangeText={(t) => setForm({ ...form, boatClass: t })} />
            <TextInput style={styles.input} placeholder="Ergebnis (Zeit)" placeholderTextColor={Colors.muted} value={form.result} onChangeText={(t) => setForm({ ...form, result: t })} />
            <TextInput style={styles.input} placeholder="Platzierung" placeholderTextColor={Colors.muted} keyboardType="numeric" value={form.placement} onChangeText={(t) => setForm({ ...form, placement: t })} />
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
  emptyText: { color: Colors.muted, fontSize: 13, textAlign: 'center', marginTop: 24 },
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

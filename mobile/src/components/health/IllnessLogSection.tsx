import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Plus, X, Stethoscope, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { IllnessLogEntry } from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  startDate: today(),
  endDate: '',
  symptoms: [] as string[],
  medications: [] as string[],
  doctorVisits: false,
  trainingPausedFrom: '',
  trainingPausedUntil: '',
  returnedToTrainingOn: '',
  notes: '',
};

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  function add() {
    if (!draft.trim()) return;
    onChange([...values, draft.trim()]);
    setDraft('');
  }
  return (
    <View>
      <View style={styles.tagRow}>
        {values.map((v, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{v}</Text>
            <Pressable onPress={() => onChange(values.filter((_, idx) => idx !== i))}>
              <X size={11} color={Colors.muted} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
        />
        <Pressable onPress={add} style={styles.addBtn}>
          <Plus size={16} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}

export function IllnessLogSection() {
  const [entries, setEntries] = useState<IllnessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function load() {
    api.illnessLog.list().then((d) => {
      setEntries(d);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function save() {
    await api.illnessLog.create({
      startDate: form.startDate,
      endDate: form.endDate || null,
      symptoms: form.symptoms,
      medications: form.medications,
      doctorVisits: form.doctorVisits,
      trainingPausedFrom: form.trainingPausedFrom || null,
      trainingPausedUntil: form.trainingPausedUntil || null,
      returnedToTrainingOn: form.returnedToTrainingOn || null,
      notes: form.notes,
    });
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    await api.illnessLog.remove(id);
    load();
  }

  if (loading) return null;

  const active = entries.filter((e) => !e.endDate);
  const past = entries.filter((e) => e.endDate);

  return (
    <Card title="Krankheiten & Verletzungen" subtitle="Wird dem KI-Coach für angepasste Empfehlungen bereitgestellt">
      <View style={{ gap: 12 }}>
        {active.map((e) => (
          <View key={e.id} style={styles.activeBox}>
            <Stethoscope size={15} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Aktiv seit {e.startDate}</Text>
              <Text style={styles.activeSub}>{e.symptoms.join(', ') || 'keine Symptome angegeben'}</Text>
            </View>
            <Pressable onPress={() => remove(e.id)}>
              <Trash2 size={14} color={Colors.negative} />
            </Pressable>
          </View>
        ))}

        {past.map((e) => (
          <View key={e.id} style={styles.pastRow}>
            <Text style={styles.pastText}>
              {e.startDate} – {e.endDate}: {e.symptoms.join(', ') || '–'}
            </Text>
            <Pressable onPress={() => remove(e.id)}>
              <Trash2 size={13} color={Colors.negative} />
            </Pressable>
          </View>
        ))}

        {active.length === 0 && past.length === 0 && <Text style={styles.hint}>Keine Einträge.</Text>}

        {!showForm ? (
          <Pressable onPress={() => setShowForm(true)} style={styles.addEntryBtn}>
            <Plus size={15} color={Colors.accent} />
            <Text style={styles.addEntryText}>Krankheit/Verletzung erfassen</Text>
          </Pressable>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Beginn (JJJJ-MM-TT)</Text>
            <TextInput style={styles.dateInput} value={form.startDate} onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))} placeholderTextColor={Colors.muted} />
            <Text style={styles.label}>Ende (leer = aktiv)</Text>
            <TextInput
              style={styles.dateInput}
              value={form.endDate}
              onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))}
              placeholder="JJJJ-MM-TT"
              placeholderTextColor={Colors.muted}
            />
            <Text style={styles.label}>Symptome</Text>
            <TagInput values={form.symptoms} onChange={(v) => setForm((f) => ({ ...f, symptoms: v }))} placeholder="Symptom hinzufügen…" />
            <Text style={styles.label}>Medikamente</Text>
            <TagInput values={form.medications} onChange={(v) => setForm((f) => ({ ...f, medications: v }))} placeholder="Medikament hinzufügen…" />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Arztbesuch(e)</Text>
              <Switch value={form.doctorVisits} onValueChange={(v) => setForm((f) => ({ ...f, doctorVisits: v }))} trackColor={{ true: Colors.accent, false: Colors.border }} />
            </View>
            <Text style={styles.label}>Rückkehr ins Training (JJJJ-MM-TT)</Text>
            <TextInput
              style={styles.dateInput}
              value={form.returnedToTrainingOn}
              onChangeText={(v) => setForm((f) => ({ ...f, returnedToTrainingOn: v }))}
              placeholderTextColor={Colors.muted}
            />
            <Text style={styles.label}>Notizen</Text>
            <TextInput
              style={styles.notesInput}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              multiline
              placeholderTextColor={Colors.muted}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={save} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Speichern</Text>
              </Pressable>
              <Pressable onPress={() => setShowForm(false)} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                <Text style={{ color: Colors.muted, fontSize: 13 }}>Abbrechen</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.muted, fontSize: 13 },
  activeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: `${Colors.warning}1a`, borderWidth: 1, borderColor: `${Colors.warning}4d`, borderRadius: 10, padding: 12 },
  activeTitle: { color: Colors.foreground, fontSize: 13, fontWeight: '600' },
  activeSub: { color: Colors.muted, fontSize: 12, marginTop: 2 },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pastText: { flex: 1, color: Colors.muted, fontSize: 13 },
  addEntryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addEntryText: { color: Colors.accent, fontSize: 13, fontWeight: '600' },
  form: { gap: 6, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  label: { fontSize: 11, color: Colors.muted, marginTop: 6 },
  dateInput: { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: Colors.foreground, fontSize: 13 },
  notesInput: { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: Colors.foreground, fontSize: 13, minHeight: 60, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { color: Colors.foreground, fontSize: 12 },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: Colors.foreground, fontSize: 13 },
  addBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, marginTop: 8 },
  saveBtnText: { color: '#000', fontWeight: '600', fontSize: 13 },
});

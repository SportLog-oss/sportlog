import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

export function NotesSection({ activityId }: { activityId: number }) {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.activityNotes.list().then((notes) => {
      const existing = notes.find((n) => n.activityId === activityId)?.note ?? '';
      setNote(existing);
      setSaved(existing);
      setLoaded(true);
    });
  }, [activityId]);

  async function save() {
    setSaving(true);
    try {
      await api.activityNotes.upsert(activityId, note);
      setSaved(note);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <Card title="Notizen">
      <TextInput
        style={styles.input}
        placeholder="Noch keine Notizen zu dieser Einheit."
        placeholderTextColor={Colors.muted}
        multiline
        value={note}
        onChangeText={setNote}
      />
      {note !== saved && (
        <Pressable onPress={save} disabled={saving} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>{saving ? 'Speichern…' : 'Speichern'}</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.foreground,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: { backgroundColor: Colors.accent, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8 },
  saveButtonText: { color: '#000', fontWeight: '600', fontSize: 13 },
});

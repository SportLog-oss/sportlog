import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { api } from '@/lib/api';
import type { ChatMessage } from '@/lib/types';

const SUGGESTIONS = [
  'Bin ich heute bereit für ein intensives Training?',
  'Warum ist meine HFV zuletzt gesunken?',
  'Vergleiche diese Woche mit letzter Woche.',
  'Gibt es Anzeichen für Übertraining?',
];

export default function CoachScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const { reply } = await api.coach(next);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Abrufen der Antwort.');
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
        {messages.length === 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.hintText}>Ein paar Ideen zum Einstieg:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestion} onPress={() => send(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {messages.map((m, i) => (
          <View key={i} style={[styles.bubbleRow, { justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={m.role === 'user' ? styles.userText : styles.assistantText}>{m.content}</Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={[styles.bubbleRow, { justifyContent: 'flex-start' }]}>
            <View style={[styles.bubble, styles.assistantBubble, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={Colors.muted} />
              <Text style={styles.assistantText}>Der Coach denkt nach…</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Frag deinen KI-Coach…"
          placeholderTextColor={Colors.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
        />
        <Pressable style={styles.sendButton} onPress={() => send(input)} disabled={loading}>
          <Send size={18} color="#000" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 20 },
  hintText: { color: Colors.muted, fontSize: 13 },
  suggestion: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  suggestionText: { color: Colors.foreground, fontSize: 13 },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: Colors.accent },
  assistantBubble: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  userText: { color: '#000', fontSize: 14, lineHeight: 20 },
  assistantText: { color: Colors.foreground, fontSize: 14, lineHeight: 20 },
  errorBox: { backgroundColor: 'rgba(248,113,113,0.1)', borderColor: `${Colors.negative}55`, borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { color: Colors.negative, fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.foreground,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

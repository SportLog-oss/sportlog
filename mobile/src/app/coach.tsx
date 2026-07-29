import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Send, MessageSquarePlus, MessagesSquare, Search, Pencil, Trash2, X, Check } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { api } from '@/lib/api';
import type { ChatSession, PersistedChatMessage } from '@/lib/types';

const SUGGESTIONS = [
  'Bin ich heute bereit für ein intensives Training?',
  'Warum ist meine HFV zuletzt gesunken?',
  'Vergleiche diese Woche mit letzter Woche.',
  'Gibt es Anzeichen für Übertraining?',
];

type DisplayMessage = PersistedChatMessage & { streaming?: boolean };

export default function CoachScreen() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listVisible, setListVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const idCounter = useRef(0);

  function genLocalId(prefix: string): string {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  useEffect(() => {
    api.coachSessions.list().then(setSessions).catch(() => {});
  }, []);

  async function refreshSessions(q?: string) {
    try {
      setSessions(await api.coachSessions.list(q));
    } catch {
      // best-effort
    }
  }

  async function selectChat(id: string) {
    setActiveChatId(id);
    setError(null);
    setListVisible(false);
    try {
      setMessages(await api.coachSessions.messages(id));
    } catch {
      setMessages([]);
    }
  }

  async function createChat(): Promise<string> {
    const session = await api.coachSessions.create();
    setSessions((s) => [session, ...s]);
    setActiveChatId(session.id);
    setMessages([]);
    setListVisible(false);
    return session.id;
  }

  async function renameChat(id: string) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await api.coachSessions.rename(id, renameValue.trim());
    setSessions((s) => s.map((sess) => (sess.id === id ? { ...sess, title: renameValue.trim() } : sess)));
    setRenamingId(null);
  }

  async function deleteChat(id: string) {
    await api.coachSessions.remove(id);
    setSessions((s) => s.filter((sess) => sess.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
    }
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setError(null);
    setInput('');

    let chatId = activeChatId;
    if (!chatId) chatId = await createChat();

    const userMsg: DisplayMessage = { id: genLocalId('local'), chatId, role: 'user', content: text, createdAt: new Date().toISOString() };
    const placeholderId = genLocalId('streaming');
    const placeholder: DisplayMessage = {
      id: placeholderId,
      chatId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
    };
    setMessages((m) => [...m, userMsg, placeholder]);
    setLoading(true);

    api.streamCoach(chatId, text, {
      onSnapshot: (snapshot) => {
        setMessages((m) => m.map((msg) => (msg.id === placeholderId ? { ...msg, content: snapshot } : msg)));
      },
      onDone: (finalMsg) => {
        setMessages((m) => m.map((msg) => (msg.id === placeholderId ? finalMsg : msg)));
        setLoading(false);
        refreshSessions(query);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      },
      onError: (msg) => {
        setError(msg);
        setMessages((m) => m.filter((message) => message.id !== placeholderId));
        setLoading(false);
      },
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBarBtn} onPress={() => setListVisible(true)}>
          <MessagesSquare size={17} color={Colors.foreground} />
          <Text style={styles.topBarBtnText} numberOfLines={1}>
            {sessions.find((s) => s.id === activeChatId)?.title ?? 'Chats'}
          </Text>
        </Pressable>
        <Pressable style={styles.newChatBtn} onPress={createChat}>
          <MessageSquarePlus size={20} color={Colors.accent} />
        </Pressable>
      </View>

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

        {messages.map((m) => (
          <View key={m.id} style={[styles.bubbleRow, { justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              {m.streaming && m.content === '' ? (
                <ActivityIndicator size="small" color={Colors.muted} />
              ) : (
                <Text style={m.role === 'user' ? styles.userText : styles.assistantText}>{m.content}</Text>
              )}
            </View>
          </View>
        ))}

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

      <Modal visible={listVisible} transparent animationType="slide" onRequestClose={() => setListVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setListVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Chats</Text>
            <Pressable onPress={() => setListVisible(false)}>
              <X size={20} color={Colors.muted} />
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <Search size={14} color={Colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Chats durchsuchen…"
              placeholderTextColor={Colors.muted}
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                refreshSessions(t);
              }}
            />
          </View>
          <Pressable style={styles.newChatRow} onPress={createChat}>
            <MessageSquarePlus size={16} color="#000" />
            <Text style={styles.newChatRowText}>Neuer Chat</Text>
          </Pressable>
          <ScrollView style={{ maxHeight: 360 }}>
            {sessions.map((s) => (
              <View key={s.id} style={[styles.sessionRow, s.id === activeChatId && styles.sessionRowActive]}>
                {renamingId === s.id ? (
                  <View style={styles.renameRow}>
                    <TextInput
                      style={styles.renameInput}
                      value={renameValue}
                      onChangeText={setRenameValue}
                      autoFocus
                      onSubmitEditing={() => renameChat(s.id)}
                    />
                    <Pressable onPress={() => renameChat(s.id)}>
                      <Check size={16} color={Colors.accent} />
                    </Pressable>
                    <Pressable onPress={() => setRenamingId(null)}>
                      <X size={16} color={Colors.muted} />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Pressable style={{ flex: 1 }} onPress={() => selectChat(s.id)}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {s.title}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setRenamingId(s.id);
                        setRenameValue(s.title);
                      }}
                      style={styles.sessionIconBtn}
                    >
                      <Pencil size={14} color={Colors.muted} />
                    </Pressable>
                    <Pressable onPress={() => deleteChat(s.id)} style={styles.sessionIconBtn}>
                      <Trash2 size={14} color={Colors.negative} />
                    </Pressable>
                  </>
                )}
              </View>
            ))}
            {sessions.length === 0 && <Text style={styles.hintText}>Noch keine Chats.</Text>}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  topBarBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceRaised, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  topBarBtnText: { color: Colors.foreground, fontSize: 13, fontWeight: '600', flex: 1 },
  newChatBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '75%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { color: Colors.foreground, fontSize: 16, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: Colors.foreground, fontSize: 13 },
  newChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  newChatRowText: { color: '#000', fontSize: 14, fontWeight: '600' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8 },
  sessionRowActive: { backgroundColor: Colors.accentSoft },
  sessionTitle: { color: Colors.foreground, fontSize: 14 },
  sessionIconBtn: { padding: 6 },
  renameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  renameInput: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: Colors.foreground,
    fontSize: 13,
  },
});

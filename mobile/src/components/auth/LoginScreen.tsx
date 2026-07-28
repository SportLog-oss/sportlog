import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { api, setApiPassword, UnauthorizedError } from '@/lib/api';
import { setStoredPassword } from '@/lib/authStore';

export function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!password) return;
    setLoading(true);
    setError(null);
    setApiPassword(password);
    try {
      await api.auth.verify();
      await setStoredPassword(password);
      onSuccess();
    } catch (e) {
      setApiPassword(null);
      setError(e instanceof UnauthorizedError ? 'Falsches Passwort' : 'Verbindung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Sportlog</Text>
        <Text style={styles.subtitle}>Privater Zugang — bitte Passwort eingeben</Text>
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          placeholderTextColor={Colors.muted}
          secureTextEntry
          autoFocus
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Anmelden</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.five,
  },
  title: {
    color: Colors.foreground,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  input: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    color: Colors.foreground,
    fontSize: 15,
    marginBottom: Spacing.three,
  },
  error: {
    color: Colors.negative,
    fontSize: 13,
    marginBottom: Spacing.three,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
});

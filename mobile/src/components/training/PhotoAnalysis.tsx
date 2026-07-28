import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Sparkles, Upload, X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { API_BASE_URL } from '@/lib/api';

export function PhotoAnalysis() {
  const [uri, setUri] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Zugriff auf Fotos wurde nicht erlaubt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUri(asset.uri);
    setBase64(asset.base64 ?? null);
    setMimeType(asset.mimeType ?? 'image/jpeg');
    setAnalysis(null);
    setError(null);
  }

  async function analyze() {
    if (!base64) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Analyse fehlgeschlagen');
      } else {
        setAnalysis(data.analysis);
      }
    } catch {
      setError('Verbindung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setUri(null);
    setBase64(null);
    setAnalysis(null);
    setError(null);
  }

  return (
    <Card title="Ergo-Foto analysieren" subtitle="Foto vom Ergometer-Display hochladen">
      {!uri && (
        <Pressable onPress={pickImage} style={styles.dropzone}>
          <Upload size={22} color={Colors.muted} />
          <Text style={styles.dropzoneText}>Foto auswählen</Text>
        </Pressable>
      )}

      {uri && (
        <View style={{ gap: 10 }}>
          <View>
            <Image source={{ uri }} style={styles.preview} resizeMode="contain" />
            <Pressable onPress={reset} style={styles.removeBtn}>
              <X size={16} color={Colors.foreground} />
            </Pressable>
          </View>

          {!analysis && (
            <Pressable onPress={analyze} disabled={loading} style={styles.analyzeBtn}>
              {loading ? <ActivityIndicator size="small" color="#000" /> : <Sparkles size={15} color="#000" />}
              <Text style={styles.analyzeBtnText}>{loading ? 'Analysiere…' : 'Analysieren'}</Text>
            </Pressable>
          )}

          {!!error && <Text style={{ color: Colors.negative, fontSize: 13 }}>{error}</Text>}

          {!!analysis && <Text style={styles.analysisText}>{analysis}</Text>}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  dropzone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  dropzoneText: { color: Colors.muted, fontSize: 13 },
  preview: { width: '100%', height: 200, borderRadius: 10, backgroundColor: Colors.surfaceRaised },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 4 },
  analyzeBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 12 },
  analyzeBtnText: { color: '#000', fontWeight: '600', fontSize: 14 },
  analysisText: { color: Colors.foreground, fontSize: 13, lineHeight: 19, backgroundColor: Colors.surfaceRaised, borderRadius: 10, padding: 12 },
});

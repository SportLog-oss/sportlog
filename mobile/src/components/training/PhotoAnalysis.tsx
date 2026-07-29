import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Sparkles, Upload, Camera, X, CheckCircle2, Trophy, AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

type AnalyzeResult = {
  analysis: string;
  readable: boolean;
  matchedActivity: { activityId: number; activityName: string; date: string } | null;
  benchmarkUpdate: { name: string; value: number; isNewBest: boolean } | null;
  extracted: { distanceMeters: number | null; durationSeconds: number | null };
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PhotoAnalysis() {
  const [uri, setUri] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyAsset(asset: ImagePicker.ImagePickerAsset) {
    setUri(asset.uri);
    setBase64(asset.base64 ?? null);
    setMimeType(asset.mimeType ?? 'image/jpeg');
    setResult(null);
    setError(null);
  }

  async function pickFromLibrary() {
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
    applyAsset(result.assets[0]);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Zugriff auf die Kamera wurde nicht erlaubt.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    applyAsset(result.assets[0]);
  }

  async function analyze() {
    if (!base64) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.analyzePhoto(base64, mimeType);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyse fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setUri(null);
    setBase64(null);
    setResult(null);
    setError(null);
  }

  return (
    <Card title="Foto analysieren" subtitle="Ergometer-Display, GPS-Uhr oder Trainingsprotokoll fotografieren">
      {!uri && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={takePhoto} style={[styles.dropzone, { flex: 1 }]}>
            <Camera size={22} color={Colors.muted} />
            <Text style={styles.dropzoneText}>Foto aufnehmen</Text>
          </Pressable>
          <Pressable onPress={pickFromLibrary} style={[styles.dropzone, { flex: 1 }]}>
            <Upload size={22} color={Colors.muted} />
            <Text style={styles.dropzoneText}>Aus Galerie</Text>
          </Pressable>
        </View>
      )}

      {uri && (
        <View style={{ gap: 10 }}>
          <View>
            <Image source={{ uri }} style={styles.preview} resizeMode="contain" />
            <Pressable onPress={reset} style={styles.removeBtn}>
              <X size={16} color={Colors.foreground} />
            </Pressable>
          </View>

          {!result && (
            <Pressable onPress={analyze} disabled={loading} style={styles.analyzeBtn}>
              {loading ? <ActivityIndicator size="small" color="#000" /> : <Sparkles size={15} color="#000" />}
              <Text style={styles.analyzeBtnText}>{loading ? 'Analysiere…' : 'Analysieren'}</Text>
            </Pressable>
          )}

          {!!error && <Text style={{ color: Colors.negative, fontSize: 13 }}>{error}</Text>}

          {!!result && (
            <View style={{ gap: 8 }}>
              {!result.readable && (
                <View style={styles.warnBanner}>
                  <AlertTriangle size={15} color={Colors.warning} />
                  <Text style={styles.warnBannerText}>Foto konnte nicht ausgewertet werden — siehe Hinweis unten.</Text>
                </View>
              )}
              {result.readable && result.extracted.distanceMeters != null && result.extracted.durationSeconds != null && (
                <View style={styles.extractedBanner}>
                  <CheckCircle2 size={15} color={Colors.accent} />
                  <Text style={styles.extractedBannerText}>
                    Erkannt: {result.extracted.distanceMeters} m in {formatClock(result.extracted.durationSeconds)}
                  </Text>
                </View>
              )}
              {result.matchedActivity && (
                <View style={styles.matchBanner}>
                  <CheckCircle2 size={15} color={Colors.positive} />
                  <Text style={styles.matchBannerText}>
                    Gespeichert als Notiz zu &quot;{result.matchedActivity.activityName}&quot; ({result.matchedActivity.date})
                  </Text>
                </View>
              )}
              {result.benchmarkUpdate?.isNewBest && (
                <View style={styles.bestBanner}>
                  <Trophy size={15} color={Colors.accent} />
                  <Text style={styles.bestBannerText}>
                    Neuer Bestwert gespeichert: {result.benchmarkUpdate.name} – {formatClock(result.benchmarkUpdate.value)}
                  </Text>
                </View>
              )}
              <Text style={styles.analysisText}>{result.analysis}</Text>
              <Pressable onPress={reset} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Neues Foto</Text>
              </Pressable>
            </View>
          )}
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
  retryBtn: { alignItems: 'center', paddingVertical: 10 },
  retryBtnText: { color: Colors.accent, fontSize: 13, fontWeight: '600' },
  analysisText: { color: Colors.foreground, fontSize: 13, lineHeight: 19, backgroundColor: Colors.surfaceRaised, borderRadius: 10, padding: 12 },
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.positive}4d`,
    backgroundColor: `${Colors.positive}1a`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  matchBannerText: { color: Colors.positive, fontSize: 13, flex: 1 },
  bestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.accent}4d`,
    backgroundColor: Colors.accentSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bestBannerText: { color: Colors.accent, fontSize: 13, flex: 1 },
  extractedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.accent}4d`,
    backgroundColor: `${Colors.accent}14`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  extractedBannerText: { color: Colors.accent, fontSize: 13, flex: 1 },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.warning}4d`,
    backgroundColor: `${Colors.warning}1a`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warnBannerText: { color: Colors.warning, fontSize: 13, flex: 1 },
});

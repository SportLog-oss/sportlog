import Constants from 'expo-constants';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'http://localhost:3000';

let cachedPassword: string | null = null;

export function setApiPassword(password: string | null) {
  cachedPassword = password;
}

export class UnauthorizedError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cachedPassword ? { 'x-app-password': cachedPassword } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) throw new UnauthorizedError('Falsches Passwort');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Anfrage fehlgeschlagen (${res.status})`);
  }
  return res.json();
}

export const api = {
  auth: {
    verify: () => request<{ ok: boolean }>('/api/auth/verify'),
  },
  refresh: () => request<{ ok: boolean }>('/api/refresh', { method: 'POST' }),
  dashboard: () => request<import('./types').DashboardResponse>('/api/dashboard'),
  training: () => request<import('./types').TrainingResponse>('/api/training'),
  health: () => request<import('./types').HealthResponse>('/api/health'),
  goals: {
    list: () => request<import('./types').Goal[]>('/api/goals'),
    create: (body: Partial<import('./types').Goal>) =>
      request<import('./types').Goal>('/api/goals', { method: 'POST', body: JSON.stringify(body) }),
    update: (body: Partial<import('./types').Goal> & { id: string }) =>
      request<import('./types').Goal>('/api/goals', { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => request('/api/goals', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  competitions: {
    list: () => request<import('./types').CompetitionResult[]>('/api/competitions'),
    create: (body: Partial<import('./types').CompetitionResult>) =>
      request<import('./types').CompetitionResult>('/api/competitions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id: string) => request('/api/competitions', { method: 'DELETE', body: JSON.stringify({ id }) }),
    update: (body: Partial<import('./types').CompetitionResult> & { id: string }) =>
      request<import('./types').CompetitionResult>('/api/competitions', { method: 'PUT', body: JSON.stringify(body) }),
    analyze: (id: string) =>
      request<import('./types').CompetitionResult>(`/api/competitions/${id}/analyze`, { method: 'POST' }),
  },
  reminderPreferences: {
    get: () => request<import('./types').ReminderPreferences>('/api/reminders/preferences'),
    update: (body: Partial<Pick<import('./types').ReminderPreferences, 'enabledTypes' | 'preferredHour'>>) =>
      request<import('./types').ReminderPreferences>('/api/reminders/preferences', { method: 'PUT', body: JSON.stringify(body) }),
  },
  illnessLog: {
    list: () => request<import('./types').IllnessLogEntry[]>('/api/health/illness'),
    create: (body: Partial<import('./types').IllnessLogEntry>) =>
      request<import('./types').IllnessLogEntry>('/api/health/illness', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: string) => request('/api/health/illness', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  mentalHealth: {
    list: () => request<import('./types').MentalHealthCheckin[]>('/api/mental-health'),
    create: (body: Partial<import('./types').MentalHealthCheckin>) =>
      request<import('./types').MentalHealthCheckin>('/api/mental-health', { method: 'POST', body: JSON.stringify(body) }),
  },
  coachSessions: {
    list: (q?: string) =>
      request<import('./types').ChatSession[]>(`/api/coach/sessions${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    create: () => request<import('./types').ChatSession>('/api/coach/sessions', { method: 'POST' }),
    rename: (id: string, title: string) =>
      request<import('./types').ChatSession>('/api/coach/sessions', {
        method: 'PUT',
        body: JSON.stringify({ id, title }),
      }),
    remove: (id: string) => request('/api/coach/sessions', { method: 'DELETE', body: JSON.stringify({ id }) }),
    messages: (id: string) => request<import('./types').PersistedChatMessage[]>(`/api/coach/sessions/${id}/messages`),
  },
  /**
   * RN's fetch doesn't reliably expose a streamable response.body, so this uses the classic
   * XMLHttpRequest progressive-responseText pattern to consume the coach's SSE stream.
   */
  streamCoach: (
    chatId: string,
    message: string,
    handlers: { onSnapshot: (snapshot: string) => void; onDone: (message: import('./types').PersistedChatMessage) => void; onError: (message: string) => void }
  ): { cancel: () => void } => {
    const xhr = new XMLHttpRequest();
    let lastLength = 0;
    let buffer = '';

    function processNewText(newText: string) {
      buffer += newText;
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        if (!frame.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(frame.slice(6));
          if (json.snapshot != null) handlers.onSnapshot(json.snapshot);
          else if (json.done) handlers.onDone(json.message);
          else if (json.error) handlers.onError(json.error);
        } catch {
          // ignore malformed frame fragments
        }
      }
    }

    xhr.open('POST', `${API_BASE_URL}/api/coach`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (cachedPassword) xhr.setRequestHeader('x-app-password', cachedPassword);
    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 3 && xhr.responseText.length > lastLength) {
        const newText = xhr.responseText.slice(lastLength);
        lastLength = xhr.responseText.length;
        processNewText(newText);
      }
      if (xhr.readyState === 4 && (xhr.status < 200 || xhr.status >= 300)) {
        handlers.onError(`Anfrage fehlgeschlagen (${xhr.status})`);
      }
    };
    xhr.onerror = () => handlers.onError('Verbindung zum KI-Coach fehlgeschlagen.');
    xhr.send(JSON.stringify({ chatId, message }));

    return { cancel: () => xhr.abort() };
  },
  analyzePhoto: (imageBase64: string, mimeType: string) =>
    request<{
      analysis: string;
      readable: boolean;
      extracted: { distanceMeters: number | null; durationSeconds: number | null };
      matchedActivity: { activityId: number; activityName: string; date: string } | null;
      benchmarkUpdate: { name: string; value: number; isNewBest: boolean } | null;
    }>('/api/analyze-photo', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) }),
  strength: {
    list: () => request<import('./types').StrengthSession[]>('/api/strength'),
    create: (body: Partial<import('./types').StrengthSession>) =>
      request<import('./types').StrengthSession>('/api/strength', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: string) => request('/api/strength', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  sleepDetail: () =>
    request<{
      hasData: boolean;
      date: string;
      score: number | null;
      scoreQualifier: string | null;
      durationSec: number;
      deepSec: number | null;
      lightSec: number | null;
      remSec: number | null;
      awakeSec: number | null;
      factors: { label: string; value: string }[];
      overnightHrv: number | null;
      overnightHrvHigh: number | null;
    }>('/api/health/sleep-detail'),
  activityDetails: (activityId: number) =>
    request<{
      hasDetails: boolean;
      trainingEffect: number | null;
      anaerobicTrainingEffect: number | null;
      totalAscent: number | null;
      totalDescent: number | null;
      sweatLossMl: number | null;
      rpe: number | null;
      laps: {
        index: number;
        duration: string;
        distance: string;
        paceOrSpeed: string;
        hrAvg: number | null;
        hrMax: number | null;
        cadenceAvg: number | null;
        cadenceMax: number | null;
        powerW: number | null;
        ascentM: number | null;
        descentM: number | null;
      }[];
      series: import('./types').ActivitySeriesPoint[];
    }>(`/api/training/${activityId}/details`),
  trainingLog: {
    get: (activityId: number) => request<import('./types').TrainingLogEntry | null>(`/api/training/${activityId}/log`),
    save: (activityId: number, body: Partial<import('./types').TrainingLogEntry>) =>
      request<import('./types').TrainingLogEntry>(`/api/training/${activityId}/log`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },
  activitySummary: (activityId: number) =>
    request<{ summary: string }>(`/api/training/${activityId}/summary`, { method: 'POST' }),
  activityNotes: {
    list: () => request<{ activityId: number; note: string; updatedAt: string }[]>('/api/activity-notes'),
    upsert: (activityId: number, note: string) =>
      request<{ activityId: number; note: string; updatedAt: string }>('/api/activity-notes', {
        method: 'POST',
        body: JSON.stringify({ activityId, note }),
      }),
  },
  benchmarks: {
    list: () => request<import('./types').Benchmark[]>('/api/benchmarks'),
    create: (body: Partial<import('./types').Benchmark> & { firstValue?: number; firstDate?: string }) =>
      request<import('./types').Benchmark>('/api/benchmarks', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: string) => request('/api/benchmarks', { method: 'DELETE', body: JSON.stringify({ id }) }),
    addEntry: (id: string, body: { date: string; value: number }) =>
      request<import('./types').Benchmark>(`/api/benchmarks/${id}/entries`, { method: 'POST', body: JSON.stringify(body) }),
  },
};

export { API_BASE_URL };

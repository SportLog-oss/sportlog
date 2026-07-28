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
  coach: (messages: import('./types').ChatMessage[]) =>
    request<{ reply: string }>('/api/coach', { method: 'POST', body: JSON.stringify({ messages }) }),
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
    }>(`/api/training/${activityId}/details`),
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

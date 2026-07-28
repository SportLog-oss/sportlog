import Constants from 'expo-constants';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Anfrage fehlgeschlagen (${res.status})`);
  }
  return res.json();
}

export const api = {
  dashboard: () => request<import('./types').DashboardResponse>('/api/dashboard'),
  training: () => request<import('./types').TrainingResponse>('/api/training'),
  health: () => request<import('./types').HealthResponse>('/api/health'),
  goals: {
    list: () => request<import('./types').Goal[]>('/api/goals'),
    create: (body: Partial<import('./types').Goal>) =>
      request<import('./types').Goal>('/api/goals', { method: 'POST', body: JSON.stringify(body) }),
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
  plannedSessions: {
    list: () => request<import('./types').PlannedSession[]>('/api/planned-sessions'),
    create: (body: Partial<import('./types').PlannedSession>) =>
      request<import('./types').PlannedSession>('/api/planned-sessions', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: string) => request('/api/planned-sessions', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  strength: {
    list: () => request<import('./types').StrengthSession[]>('/api/strength'),
    create: (body: Partial<import('./types').StrengthSession>) =>
      request<import('./types').StrengthSession>('/api/strength', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: string) => request('/api/strength', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  benchmarks: {
    list: () => request<import('./types').Benchmark[]>('/api/benchmarks'),
    create: (body: Partial<import('./types').Benchmark>) =>
      request<import('./types').Benchmark>('/api/benchmarks', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: string) => request('/api/benchmarks', { method: 'DELETE', body: JSON.stringify({ id }) }),
    addEntry: (id: string, body: { date: string; value: number }) =>
      request<import('./types').Benchmark>(`/api/benchmarks/${id}/entries`, { method: 'POST', body: JSON.stringify(body) }),
  },
};

export { API_BASE_URL };

import type {
  AuthConfig,
  CreateEntryRequest,
  DailyStatsResponse,
  Department,
  Kpi,
  LoginRequest,
  LoginResponse,
  MonthlyStatsResponse,
  MySummaryResponse,
  RateMetric,
  RosterSyncResult,
  Target,
  Team,
  User,
  Venue,
} from '@saiji/shared';
import { api } from './client';

/** 一覧レスポンス {data:[]} から配列を取り出す */
async function list<T>(url: string, params?: Record<string, unknown>): Promise<T[]> {
  const res = await api.get<{ data: T[] }>(url, { params });
  return res.data.data;
}

// ---------------- 認証 ----------------
export const authApi = {
  config: () => api.get<AuthConfig>('/auth/config').then((r) => r.data),
  google: (credential: string) => api.post<LoginResponse>('/auth/google', { credential }).then((r) => r.data),
  login: (body: LoginRequest) => api.post<LoginResponse>('/auth/login', body).then((r) => r.data),
  me: () => api.get<{ user: LoginResponse['user'] }>('/auth/me').then((r) => r.data.user),
};

// ---------------- 名簿(Googleシート)同期 ----------------
export const rosterApi = {
  sync: () => api.post<RosterSyncResult>('/roster/sync').then((r) => r.data),
};

// ---------------- KPI 入力 ----------------
export const entriesApi = {
  create: (body: CreateEntryRequest) => api.post('/entries', body).then((r) => r.data),
  undo: () => api.post('/entries/undo').then((r) => r.data),
  mySummary: (date?: string) =>
    api.get<MySummaryResponse>('/entries/summary/me', { params: { date } }).then((r) => r.data),
  /** before(YYYY-MM-DD) を渡すとその日より前だけ削除。未指定なら全期間 */
  reset: (before?: string) =>
    api.post<{ deleted: number }>('/entries/reset', before ? { before } : {}).then((r) => r.data),
};

// ---------------- 集計 ----------------
export const statsApi = {
  daily: (date?: string) => api.get<DailyStatsResponse>('/stats/daily', { params: { date } }).then((r) => r.data),
  monthly: (month?: string) =>
    api.get<MonthlyStatsResponse>('/stats/monthly', { params: { month } }).then((r) => r.data),
};

// ---------------- マスタ ----------------
export const kpiApi = {
  list: (includeInactive = true) => list<Kpi>('/kpis', { includeInactive }),
  create: (body: Partial<Kpi>) => api.post<Kpi>('/kpis', body).then((r) => r.data),
  update: (id: number, body: Partial<Kpi>) => api.put<Kpi>(`/kpis/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/kpis/${id}`),
};

export const rateApi = {
  list: (includeInactive = true) => list<RateMetric>('/rates', { includeInactive }),
  create: (body: Partial<RateMetric>) => api.post<RateMetric>('/rates', body).then((r) => r.data),
  update: (id: number, body: Partial<RateMetric>) => api.put<RateMetric>(`/rates/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/rates/${id}`),
};

export const venueApi = {
  list: (onlyActive = false) => list<Venue>('/venues', { onlyActive }),
  create: (body: Partial<Venue>) => api.post<Venue>('/venues', body).then((r) => r.data),
  update: (id: number, body: Partial<Venue>) => api.put<Venue>(`/venues/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/venues/${id}`),
};

export const departmentApi = {
  list: () => list<Department>('/org/departments'),
  create: (body: Partial<Department>) => api.post<Department>('/org/departments', body).then((r) => r.data),
  update: (id: number, body: Partial<Department>) =>
    api.put<Department>(`/org/departments/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/org/departments/${id}`),
};

export const teamApi = {
  list: () => list<Team>('/org/teams'),
  create: (body: Partial<Team>) => api.post<Team>('/org/teams', body).then((r) => r.data),
  update: (id: number, body: Partial<Team>) => api.put<Team>(`/org/teams/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/org/teams/${id}`),
};

export const userApi = {
  list: (params?: { departmentId?: number; status?: string }) => list<User>('/users', params),
  create: (body: Record<string, unknown>) => api.post<User>('/users', body).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) => api.put<User>(`/users/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/users/${id}`),
};

export const targetApi = {
  list: (params?: { periodType?: string; scope?: string }) => list<Target>('/targets', params),
  upsert: (body: Record<string, unknown>) => api.post<Target>('/targets', body).then((r) => r.data),
  remove: (id: number) => api.delete(`/targets/${id}`),
};

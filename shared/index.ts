/**
 * =============================================================================
 * 共有型定義 (Single Source of Truth)
 * -----------------------------------------------------------------------------
 * サーバー / クライアント双方がこのパッケージ (@saiji/shared) を参照します。
 * ドメインの型はここに集約し、二重定義による齟齬を防ぎます。
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// 権限・状態の列挙
// ---------------------------------------------------------------------------

/** システム権限 (ログインユーザーが持つ操作権限) */
export type Role = 'sales' | 'leader' | 'manager' | 'admin';

export const ROLE_LABELS: Record<Role, string> = {
  sales: '営業担当',
  leader: 'リーダー',
  manager: '責任者',
  admin: '管理者',
};

/** ダッシュボード(集計)を閲覧できる権限 */
export const DASHBOARD_ROLES: Role[] = ['leader', 'manager', 'admin'];
/** マスタを編集できる権限 */
export const MASTER_ROLES: Role[] = ['leader', 'manager', 'admin'];

/** 在籍状態 */
export type UserStatus = 'active' | 'inactive';

/** 会場の状態 */
export type VenueStatus = 'active' | 'inactive';

/** 目標の集計単位 */
export type PeriodType = 'daily' | 'monthly';

/** 目標の適用スコープ */
export type TargetScope = 'overall' | 'department' | 'team' | 'user' | 'venue';

// ---------------------------------------------------------------------------
// マスタ・ドメインモデル
// ---------------------------------------------------------------------------

export interface Department {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: number;
  departmentId: number | null;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Kpi {
  id: number;
  /** プログラム上の安定キー (例: call / seat / negotiation / contract)。集計や連携で利用 */
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  /** UI 上のアクセントカラー (任意) */
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Venue {
  id: number;
  name: string;
  area: string | null;
  status: VenueStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 転換率（数値項目）: 分子KPI ÷ 分母KPI で自動計算する指標 */
export interface RateMetric {
  id: number;
  name: string;
  numeratorKpiId: number;
  denominatorKpiId: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 計算後の転換率 */
export interface RateResult {
  id: number;
  name: string;
  numeratorKpiId: number;
  denominatorKpiId: number;
  numeratorCount: number;
  denominatorCount: number;
  /** 率(%)。分母0のときは0 */
  rate: number;
}

export interface User {
  id: number;
  employeeId: string;
  /** Googleアカウント(Gmail)。Googleログインの突合キー */
  email: string | null;
  /** 'manual'（手動作成）/ 'roster'（Googleシート名簿同期由来） */
  source: string;
  name: string;
  displayName: string;
  departmentId: number | null;
  departmentName?: string | null;
  teamId: number | null;
  teamName?: string | null;
  /** 役職 (自由記述: 例 リーダー / SV / 一般) */
  title: string | null;
  /** システム権限 */
  role: Role;
  /** 責任者 (users.id) */
  managerId: number | null;
  managerName?: string | null;
  status: UserStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Target {
  id: number;
  periodType: PeriodType;
  scope: TargetScope;
  /** scope に対応する対象 ID (overall の場合は null) */
  scopeId: number | null;
  kpiId: number;
  targetValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface KpiEntry {
  id: number;
  userId: number;
  kpiId: number;
  venueId: number | null;
  /** 異動後も履歴集計が安定するよう入力時点の所属をスナップショット */
  departmentId: number | null;
  teamId: number | null;
  amount: number;
  /** 業務日 (YYYY-MM-DD) */
  entryDate: string;
  isActive: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 認証
// ---------------------------------------------------------------------------

export interface LoginRequest {
  employeeId: string;
  password: string;
}

export interface AuthUser {
  id: number;
  employeeId: string;
  name: string;
  displayName: string;
  role: Role;
  departmentId: number | null;
  departmentName: string | null;
  teamId: number | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface AuthConfig {
  googleEnabled: boolean;
  googleClientId: string;
}

// 名簿(Googleシート)同期の結果
export interface RosterPerson {
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'inactive';
  action: 'created' | 'updated' | 'deactivated';
}

export interface RosterSyncResult {
  fetchedRows: number;
  created: number;
  updated: number;
  deactivated: number;
  people: RosterPerson[];
}

// ---------------------------------------------------------------------------
// KPI 入力 / 営業担当画面のサマリ
// ---------------------------------------------------------------------------

export interface CreateEntryRequest {
  kpiId: number;
  venueId?: number | null;
}

/** 営業担当画面の 1 KPI 分のサマリ */
export interface KpiSummaryItem {
  kpiId: number;
  code: string;
  name: string;
  color: string | null;
  count: number;
  target: number;
  /** 達成率 (%) 0-∞ */
  achievementRate: number;
}

export interface MySummaryResponse {
  date: string;
  venueId: number | null;
  items: KpiSummaryItem[];
  /** 転換率 */
  rates: RateResult[];
  /** Undo 可能な直近入力があるか */
  canUndo: boolean;
  lastEntry: { id: number; kpiId: number } | null;
}

// ---------------------------------------------------------------------------
// ダッシュボード / 集計
// ---------------------------------------------------------------------------

export interface KpiTotal {
  kpiId: number;
  code: string;
  name: string;
  color: string | null;
  count: number;
  target: number;
  achievementRate: number;
}

export interface RankingRow {
  id: number;
  label: string;
  sublabel?: string | null;
  /** KPI コード別の件数 */
  counts: Record<string, number>;
  /** ランキング基準となる主要 KPI の件数 */
  primaryCount: number;
  /** この対象（担当者・会場・部署）ごとの転換率 */
  rates: RateResult[];
}

export interface HourlyPoint {
  hour: number; // 0-23
  counts: Record<string, number>;
  total: number;
}

export interface DashboardScope {
  role: Role;
  /** responsible が絞り込まれている場合の対象部署 */
  departmentId: number | null;
  departmentName: string | null;
}

export interface DailyStatsResponse {
  date: string;
  scope: DashboardScope;
  totals: KpiTotal[];
  rates: RateResult[];
  userRanking: RankingRow[];
  venueRanking: RankingRow[];
  departmentRanking: RankingRow[];
  hourly: HourlyPoint[];
  /** ランキングの主要 KPI コード */
  primaryKpiCode: string | null;
}

export interface MonthlyStatsResponse {
  month: string; // YYYY-MM
  scope: DashboardScope;
  totals: KpiTotal[];
  rates: RateResult[];
  userRanking: RankingRow[];
  venueRanking: RankingRow[];
  departmentRanking: RankingRow[];
  primaryKpiCode: string | null;
}

// ---------------------------------------------------------------------------
// リアルタイム (Socket.io) イベント
// ---------------------------------------------------------------------------

export const SOCKET_EVENTS = {
  /** サーバー→クライアント: KPI 入力が発生/取消され、集計が更新された */
  KPI_UPDATE: 'kpi:update',
} as const;

export interface KpiUpdatePayload {
  type: 'created' | 'undone';
  entryId: number;
  userId: number;
  kpiId: number;
  venueId: number | null;
  departmentId: number | null;
  entryDate: string;
  month: string;
}

// ---------------------------------------------------------------------------
// 汎用 API レスポンス
// ---------------------------------------------------------------------------

export interface ApiError {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface ListResponse<T> {
  data: T[];
}

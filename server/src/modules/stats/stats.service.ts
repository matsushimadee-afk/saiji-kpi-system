import type { Knex } from 'knex';
import type {
  AuthUser,
  DailyStatsResponse,
  DashboardScope,
  HourlyPoint,
  KpiTotal,
  MonthlyStatsResponse,
  PeriodType,
  RankingRow,
} from '@saiji/shared';
import { db } from '../../config/database.js';
import { extractHour, monthRange } from '../../utils/datetime.js';
import { buildTargetIndex, resolveTarget, type ScopeRef } from '../targets/targets.service.js';
import { computeRates, getActiveRateRows } from '../rates/rates.service.js';

/** 集計スコープ (責任者は自部署、管理者は全体) */
interface Scope {
  role: AuthUser['role'];
  departmentId: number | null;
  departmentName: string | null;
}

/** ログインユーザーから集計スコープを決定する */
export function resolveScope(user: AuthUser): Scope {
  // 責任者・リーダーは自部署のみ
  if (user.role === 'manager' || user.role === 'leader') {
    return { role: user.role, departmentId: user.departmentId, departmentName: user.departmentName };
  }
  // admin は全体
  return { role: user.role, departmentId: null, departmentName: null };
}

/** entry_date 述語を適用する関数 */
type DateApplier = (q: Knex.QueryBuilder) => Knex.QueryBuilder;

/** is_active + スコープ + 期間 を適用した新しいクエリを返す */
function scopedEntries(scope: Scope, applyDate: DateApplier): Knex.QueryBuilder {
  let q = db()('kpi_entries').where('kpi_entries.is_active', true);
  if (scope.departmentId != null) q = q.where('kpi_entries.department_id', scope.departmentId);
  return applyDate(q);
}

interface KpiRow {
  id: number;
  code: string;
  name: string;
  color: string | null;
  display_order: number;
}

async function loadActiveKpis(): Promise<KpiRow[]> {
  return db()('kpis').where('is_active', true).orderBy('display_order').orderBy('id');
}

/** 目標解決の優先順位をスコープから決定 */
function targetPriorities(scope: Scope): ScopeRef[] {
  if (scope.departmentId != null) {
    return [
      { scope: 'department', scopeId: scope.departmentId },
      { scope: 'overall', scopeId: null },
    ];
  }
  return [{ scope: 'overall', scopeId: null }];
}

/** KPI 別合計と達成率 */
async function computeTotals(
  scope: Scope,
  applyDate: DateApplier,
  kpis: KpiRow[],
  periodType: PeriodType,
): Promise<KpiTotal[]> {
  const rows = await scopedEntries(scope, applyDate)
    .groupBy('kpi_entries.kpi_id')
    .select('kpi_entries.kpi_id as kpi_id')
    .sum({ total: 'amount' });
  const countMap = new Map<number, number>(rows.map((r: any) => [r.kpi_id, Number(r.total)]));

  const index = await buildTargetIndex(periodType);
  const priorities = targetPriorities(scope);

  return kpis.map((k) => {
    const count = countMap.get(k.id) ?? 0;
    const target = resolveTarget(index, k.id, priorities);
    return {
      kpiId: k.id,
      code: k.code,
      name: k.name,
      color: k.color,
      count,
      target,
      achievementRate: target > 0 ? Math.round((count / target) * 1000) / 10 : 0,
    };
  });
}

type RateRows = Awaited<ReturnType<typeof getActiveRateRows>>;

/** (id, label, kpi_id, total) の行群を RankingRow[] に整形し、対象ごとの転換率も計算する */
function assembleRanking(
  rows: Array<{ id: number | null; label: string | null; sublabel?: string | null; kpi_id: number; total: number }>,
  kpiById: Map<number, KpiRow>,
  primaryCode: string | null,
  rateRows: RateRows,
): RankingRow[] {
  const map = new Map<number, RankingRow>();
  for (const r of rows) {
    const id = r.id ?? 0;
    let row = map.get(id);
    if (!row) {
      row = { id, label: r.label ?? '(未設定)', sublabel: r.sublabel ?? null, counts: {}, primaryCount: 0, rates: [] };
      map.set(id, row);
    }
    const kpi = kpiById.get(r.kpi_id);
    if (kpi) {
      row.counts[kpi.code] = Number(r.total);
      if (kpi.code === primaryCode) row.primaryCount = Number(r.total);
    }
  }

  const list = [...map.values()];
  // 対象(担当者/会場/部署)ごとの転換率を、その対象のKPI件数から計算
  for (const row of list) {
    const countByKpiId = new Map<number, number>();
    for (const [kpiId, kpi] of kpiById) {
      countByKpiId.set(kpiId, row.counts[kpi.code] ?? 0);
    }
    row.rates = computeRates(rateRows, countByKpiId);
  }

  const sumOf = (row: RankingRow) => Object.values(row.counts).reduce((a, b) => a + b, 0);
  return list.sort((a, b) => b.primaryCount - a.primaryCount || sumOf(b) - sumOf(a));
}

async function userRanking(
  scope: Scope,
  applyDate: DateApplier,
  kpiById: Map<number, KpiRow>,
  primary: string | null,
  rateRows: RateRows,
) {
  const rows = await scopedEntries(scope, applyDate)
    .leftJoin('users', 'kpi_entries.user_id', 'users.id')
    .groupBy('kpi_entries.user_id', 'users.display_name', 'kpi_entries.kpi_id')
    .select(
      'kpi_entries.user_id as id',
      'users.display_name as label',
      'kpi_entries.kpi_id as kpi_id',
    )
    .sum({ total: 'amount' });
  return assembleRanking(rows as any, kpiById, primary, rateRows);
}

async function venueRanking(
  scope: Scope,
  applyDate: DateApplier,
  kpiById: Map<number, KpiRow>,
  primary: string | null,
  rateRows: RateRows,
) {
  const rows = await scopedEntries(scope, applyDate)
    .leftJoin('venues', 'kpi_entries.venue_id', 'venues.id')
    .groupBy('kpi_entries.venue_id', 'venues.name', 'venues.area', 'kpi_entries.kpi_id')
    .select(
      'kpi_entries.venue_id as id',
      'venues.name as label',
      'venues.area as sublabel',
      'kpi_entries.kpi_id as kpi_id',
    )
    .sum({ total: 'amount' });
  return assembleRanking(rows as any, kpiById, primary, rateRows);
}

async function departmentRanking(
  scope: Scope,
  applyDate: DateApplier,
  kpiById: Map<number, KpiRow>,
  primary: string | null,
  rateRows: RateRows,
) {
  const rows = await scopedEntries(scope, applyDate)
    .leftJoin('departments', 'kpi_entries.department_id', 'departments.id')
    .groupBy('kpi_entries.department_id', 'departments.name', 'kpi_entries.kpi_id')
    .select(
      'kpi_entries.department_id as id',
      'departments.name as label',
      'kpi_entries.kpi_id as kpi_id',
    )
    .sum({ total: 'amount' });
  return assembleRanking(rows as any, kpiById, primary, rateRows);
}

/** 時間帯別推移 (ローカル時刻でバケット化) */
async function hourlyTrend(scope: Scope, applyDate: DateApplier, kpis: KpiRow[]): Promise<HourlyPoint[]> {
  const rows = await scopedEntries(scope, applyDate).select(
    'kpi_entries.created_at as created_at',
    'kpi_entries.kpi_id as kpi_id',
    'kpi_entries.amount as amount',
  );
  const codeById = new Map(kpis.map((k) => [k.id, k.code]));
  const buckets = new Map<number, HourlyPoint>();
  for (const r of rows as any[]) {
    const hour = extractHour(r.created_at);
    let b = buckets.get(hour);
    if (!b) {
      b = { hour, counts: {}, total: 0 };
      buckets.set(hour, b);
    }
    const code = codeById.get(r.kpi_id);
    if (code) {
      b.counts[code] = (b.counts[code] ?? 0) + Number(r.amount);
      b.total += Number(r.amount);
    }
  }
  if (buckets.size === 0) return [];
  const hours = [...buckets.keys()];
  const min = Math.min(...hours);
  const max = Math.max(...hours);
  const result: HourlyPoint[] = [];
  for (let h = min; h <= max; h++) {
    result.push(buckets.get(h) ?? { hour: h, counts: {}, total: 0 });
  }
  return result;
}

function toDashboardScope(scope: Scope): DashboardScope {
  return { role: scope.role, departmentId: scope.departmentId, departmentName: scope.departmentName };
}

/** デイリー集計 */
export async function getDailyStats(user: AuthUser, date: string): Promise<DailyStatsResponse> {
  const scope = resolveScope(user);
  const kpis = await loadActiveKpis();
  const kpiById = new Map(kpis.map((k) => [k.id, k]));
  const primary = kpis.length ? kpis[kpis.length - 1].code : null;
  const applyDate: DateApplier = (q) => q.where('kpi_entries.entry_date', date);
  const rateRows = await getActiveRateRows();

  const [totals, users, venues, departments, hourly] = await Promise.all([
    computeTotals(scope, applyDate, kpis, 'daily'),
    userRanking(scope, applyDate, kpiById, primary, rateRows),
    venueRanking(scope, applyDate, kpiById, primary, rateRows),
    departmentRanking(scope, applyDate, kpiById, primary, rateRows),
    hourlyTrend(scope, applyDate, kpis),
  ]);

  const countByKpiId = new Map(totals.map((t) => [t.kpiId, t.count]));
  const rates = computeRates(rateRows, countByKpiId);

  return {
    date,
    scope: toDashboardScope(scope),
    totals,
    rates,
    userRanking: users,
    venueRanking: venues,
    departmentRanking: departments,
    hourly,
    primaryKpiCode: primary,
  };
}

/** 当月集計 */
export async function getMonthlyStats(user: AuthUser, month: string): Promise<MonthlyStatsResponse> {
  const scope = resolveScope(user);
  const kpis = await loadActiveKpis();
  const kpiById = new Map(kpis.map((k) => [k.id, k]));
  const primary = kpis.length ? kpis[kpis.length - 1].code : null;
  const { start, endExclusive } = monthRange(month);
  const applyDate: DateApplier = (q) =>
    q.where('kpi_entries.entry_date', '>=', start).where('kpi_entries.entry_date', '<', endExclusive);

  const rateRows = await getActiveRateRows();
  const [totals, users, venues, departments] = await Promise.all([
    computeTotals(scope, applyDate, kpis, 'monthly'),
    userRanking(scope, applyDate, kpiById, primary, rateRows),
    venueRanking(scope, applyDate, kpiById, primary, rateRows),
    departmentRanking(scope, applyDate, kpiById, primary, rateRows),
  ]);

  const countByKpiId = new Map(totals.map((t) => [t.kpiId, t.count]));
  const rates = computeRates(rateRows, countByKpiId);

  return {
    month,
    scope: toDashboardScope(scope),
    totals,
    rates,
    userRanking: users,
    venueRanking: venues,
    departmentRanking: departments,
    primaryKpiCode: primary,
  };
}

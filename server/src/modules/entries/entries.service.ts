import type { AuthUser, KpiUpdatePayload, MySummaryResponse } from '@saiji/shared';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { insertId } from '../../utils/db.js';
import { todayDate, nowTimestamp } from '../../utils/datetime.js';
import { buildTargetIndex, resolveTarget, type ScopeRef } from '../targets/targets.service.js';
import { computeRates, getActiveRateRows } from '../rates/rates.service.js';

interface CreatedEntry {
  entryId: number;
  payload: KpiUpdatePayload;
}

/** KPI 入力を 1 件登録する (1 タップ = +1) */
export async function createEntry(
  user: AuthUser,
  input: { kpiId: number; venueId?: number | null },
): Promise<CreatedEntry> {
  const kpi = await db()('kpis').where({ id: input.kpiId }).first();
  if (!kpi) throw AppError.badRequest('存在しないKPIです');
  if (!kpi.is_active) throw AppError.badRequest('無効化されたKPIには入力できません');

  // 入力時点の所属をスナップショット (異動後も履歴集計が安定する)
  const u = await db()('users').where({ id: user.id }).first();
  const entryDate = todayDate();

  const id = await insertId(
    db()('kpi_entries').insert({
      user_id: user.id,
      kpi_id: input.kpiId,
      venue_id: input.venueId ?? null,
      department_id: u?.department_id ?? null,
      team_id: u?.team_id ?? null,
      amount: 1,
      entry_date: entryDate,
      is_active: true,
      created_at: nowTimestamp(),
    }),
  );

  const payload: KpiUpdatePayload = {
    type: 'created',
    entryId: Number(id),
    userId: user.id,
    kpiId: input.kpiId,
    venueId: input.venueId ?? null,
    departmentId: u?.department_id ?? null,
    entryDate,
    month: entryDate.slice(0, 7),
  };
  return { entryId: Number(id), payload };
}

/** 本日の直近入力を 1 件取り消す (Undo) */
export async function undoLast(user: AuthUser): Promise<CreatedEntry> {
  const entryDate = todayDate();
  const last = await db()('kpi_entries')
    .where({ user_id: user.id, entry_date: entryDate, is_active: true })
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .first();

  if (!last) throw AppError.badRequest('取り消せる入力がありません');

  await db()('kpi_entries').where({ id: last.id }).update({ is_active: false });

  const payload: KpiUpdatePayload = {
    type: 'undone',
    entryId: last.id,
    userId: user.id,
    kpiId: last.kpi_id,
    venueId: last.venue_id ?? null,
    departmentId: last.department_id ?? null,
    entryDate,
    month: entryDate.slice(0, 7),
  };
  return { entryId: last.id, payload };
}

/** 全入力データ(カウント)を削除する。本運用前のテストデータ削除用。 */
export async function resetAllEntries(): Promise<number> {
  const deleted = await db()('kpi_entries').del();
  return Number(deleted);
}

/** 営業担当画面のサマリ (KPI ごとの件数・目標・達成率) */
export async function getMySummary(user: AuthUser, date: string): Promise<MySummaryResponse> {
  const kpis = await db()('kpis').where('is_active', true).orderBy('display_order').orderBy('id');

  const counts = await db()('kpi_entries')
    .where({ user_id: user.id, entry_date: date, is_active: true })
    .groupBy('kpi_id')
    .select('kpi_id')
    .sum({ total: 'amount' });
  const countMap = new Map<number, number>(counts.map((c: any) => [c.kpi_id, Number(c.total)]));

  const targetIndex = await buildTargetIndex('daily');
  const priorities: ScopeRef[] = [
    { scope: 'user', scopeId: user.id },
    { scope: 'department', scopeId: user.departmentId },
    { scope: 'overall', scopeId: null },
  ];

  const items = kpis.map((k: any) => {
    const count = countMap.get(k.id) ?? 0;
    const target = resolveTarget(targetIndex, k.id, priorities);
    return {
      kpiId: k.id,
      code: k.code,
      name: k.name,
      color: k.color ?? null,
      count,
      target,
      achievementRate: target > 0 ? Math.round((count / target) * 1000) / 10 : 0,
    };
  });

  // 転換率
  const rateRows = await getActiveRateRows();
  const rates = computeRates(rateRows, countMap);

  const last = await db()('kpi_entries')
    .where({ user_id: user.id, entry_date: date, is_active: true })
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .first();

  // 当日の venue を推定 (最新入力の会場)
  const venueId = last?.venue_id ?? null;

  return {
    date,
    venueId,
    items,
    rates,
    canUndo: Boolean(last),
    lastEntry: last ? { id: last.id, kpiId: last.kpi_id } : null,
  };
}

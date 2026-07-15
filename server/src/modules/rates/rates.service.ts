import type { RateMetric, RateResult } from '@saiji/shared';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { mapRateMetric } from '../../utils/mappers.js';
import { insertId } from '../../utils/db.js';

export async function listRateMetrics(includeInactive = true): Promise<RateMetric[]> {
  const q = db()('rate_metrics').orderBy('display_order').orderBy('id');
  if (!includeInactive) q.where('is_active', true);
  return (await q).map(mapRateMetric);
}

export async function createRateMetric(input: {
  name: string;
  numeratorKpiId: number;
  denominatorKpiId: number;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<RateMetric> {
  const id = await insertId(
    db()('rate_metrics').insert({
      name: input.name,
      numerator_kpi_id: input.numeratorKpiId,
      denominator_kpi_id: input.denominatorKpiId,
      display_order: input.displayOrder ?? 0,
      is_active: input.isActive ?? true,
    }),
  );
  return getRateMetric(Number(id));
}

export async function updateRateMetric(
  id: number,
  input: Partial<{ name: string; numeratorKpiId: number; denominatorKpiId: number; displayOrder: number; isActive: boolean }>,
): Promise<RateMetric> {
  const patch: Record<string, unknown> = { updated_at: db().fn.now() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.numeratorKpiId !== undefined) patch.numerator_kpi_id = input.numeratorKpiId;
  if (input.denominatorKpiId !== undefined) patch.denominator_kpi_id = input.denominatorKpiId;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  const affected = await db()('rate_metrics').where({ id }).update(patch);
  if (!affected) throw AppError.notFound('転換率が見つかりません');
  return getRateMetric(id);
}

export async function deleteRateMetric(id: number): Promise<void> {
  const affected = await db()('rate_metrics').where({ id }).del();
  if (!affected) throw AppError.notFound('転換率が見つかりません');
}

async function getRateMetric(id: number): Promise<RateMetric> {
  const row = await db()('rate_metrics').where({ id }).first();
  if (!row) throw AppError.notFound('転換率が見つかりません');
  return mapRateMetric(row);
}

// ---------------------------------------------------------------------------
// 転換率の計算（営業画面サマリ・ダッシュボードから利用）
// ---------------------------------------------------------------------------

interface RateRow {
  id: number;
  name: string;
  numerator_kpi_id: number;
  denominator_kpi_id: number;
}

/** 有効な転換率定義を表示順で取得 */
export async function getActiveRateRows(): Promise<RateRow[]> {
  return db()('rate_metrics').where('is_active', true).orderBy('display_order').orderBy('id');
}

/** KPI件数(kpiId→件数) から転換率を計算 */
export function computeRates(rows: RateRow[], countByKpiId: Map<number, number>): RateResult[] {
  return rows.map((r) => {
    const num = countByKpiId.get(r.numerator_kpi_id) ?? 0;
    const den = countByKpiId.get(r.denominator_kpi_id) ?? 0;
    return {
      id: r.id,
      name: r.name,
      numeratorKpiId: r.numerator_kpi_id,
      denominatorKpiId: r.denominator_kpi_id,
      numeratorCount: num,
      denominatorCount: den,
      rate: den > 0 ? Math.round((num / den) * 1000) / 10 : 0,
    };
  });
}

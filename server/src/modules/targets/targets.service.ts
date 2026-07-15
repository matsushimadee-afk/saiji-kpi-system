import type { PeriodType, Target, TargetScope } from '@saiji/shared';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { mapTarget } from '../../utils/mappers.js';
import { insertId } from '../../utils/db.js';

export interface TargetFilter {
  periodType?: PeriodType;
  scope?: TargetScope;
  scopeId?: number | null;
}

export async function listTargets(filter: TargetFilter = {}): Promise<Target[]> {
  const q = db()('targets').orderBy('period_type').orderBy('scope').orderBy('kpi_id');
  if (filter.periodType) q.where('period_type', filter.periodType);
  if (filter.scope) q.where('scope', filter.scope);
  if (filter.scopeId !== undefined) {
    if (filter.scopeId === null) q.whereNull('scope_id');
    else q.where('scope_id', filter.scopeId);
  }
  return (await q).map(mapTarget);
}

export interface UpsertTargetInput {
  periodType: PeriodType;
  scope: TargetScope;
  scopeId: number | null;
  kpiId: number;
  targetValue: number;
}

/** (period_type, scope, scope_id, kpi_id) をキーに UPSERT する */
export async function upsertTarget(input: UpsertTargetInput): Promise<Target> {
  const where = {
    period_type: input.periodType,
    scope: input.scope,
    kpi_id: input.kpiId,
  };
  const existing = await db()('targets')
    .where(where)
    .modify((qb) => {
      if (input.scopeId === null) qb.whereNull('scope_id');
      else qb.where('scope_id', input.scopeId);
    })
    .first();

  if (existing) {
    await db()('targets')
      .where({ id: existing.id })
      .update({ target_value: input.targetValue, updated_at: db().fn.now() });
    return getTarget(existing.id);
  }

  const id = await insertId(
    db()('targets').insert({
      period_type: input.periodType,
      scope: input.scope,
      scope_id: input.scopeId,
      kpi_id: input.kpiId,
      target_value: input.targetValue,
    }),
  );
  return getTarget(Number(id));
}

export async function deleteTarget(id: number): Promise<void> {
  const affected = await db()('targets').where({ id }).del();
  if (!affected) throw AppError.notFound('目標が見つかりません');
}

async function getTarget(id: number): Promise<Target> {
  const row = await db()('targets').where({ id }).first();
  if (!row) throw AppError.notFound('目標が見つかりません');
  return mapTarget(row);
}

// ---------------------------------------------------------------------------
// 目標解決 (集計・営業画面から利用)
// ---------------------------------------------------------------------------

export interface ScopeRef {
  scope: TargetScope;
  scopeId: number | null;
}

/** scope:scopeId:kpiId をキーにした目標値インデックス */
export type TargetIndex = Map<string, number>;

function key(scope: TargetScope, scopeId: number | null, kpiId: number): string {
  return `${scope}:${scopeId ?? 'null'}:${kpiId}`;
}

/** 指定期間の目標を全件読み込みインデックス化する */
export async function buildTargetIndex(periodType: PeriodType): Promise<TargetIndex> {
  const rows = await db()('targets').where('period_type', periodType);
  const index: TargetIndex = new Map();
  for (const r of rows) {
    index.set(key(r.scope, r.scope_id ?? null, r.kpi_id), r.target_value);
  }
  return index;
}

/**
 * 優先順位に従って KPI の目標値を解決する。
 * 例: [user → department → overall] の順で最初に見つかった値を採用。
 */
export function resolveTarget(index: TargetIndex, kpiId: number, priorities: ScopeRef[]): number {
  for (const p of priorities) {
    const v = index.get(key(p.scope, p.scopeId, kpiId));
    if (v !== undefined) return v;
  }
  return 0;
}

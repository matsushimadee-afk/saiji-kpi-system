import type { Kpi } from '@saiji/shared';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { mapKpi } from '../../utils/mappers.js';
import { insertId } from '../../utils/db.js';

export async function listKpis(includeInactive = true): Promise<Kpi[]> {
  const q = db()('kpis').orderBy('display_order').orderBy('id');
  if (!includeInactive) q.where('is_active', true);
  return (await q).map(mapKpi);
}

export async function createKpi(input: {
  code: string;
  name: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  color?: string | null;
}): Promise<Kpi> {
  const existing = await db()('kpis').where('code', input.code).first();
  if (existing) throw AppError.conflict(`KPIコード "${input.code}" は既に存在します`);
  const id = await insertId(
    db()('kpis').insert({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      display_order: input.displayOrder ?? 0,
      is_active: input.isActive ?? true,
      color: input.color ?? null,
    }),
  );
  return getKpi(Number(id));
}

export async function updateKpi(
  id: number,
  input: Partial<{ code: string; name: string; description: string | null; displayOrder: number; isActive: boolean; color: string | null }>,
): Promise<Kpi> {
  const patch: Record<string, unknown> = { updated_at: db().fn.now() };
  if (input.code !== undefined) patch.code = input.code;
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.color !== undefined) patch.color = input.color;
  const affected = await db()('kpis').where({ id }).update(patch);
  if (!affected) throw AppError.notFound('KPIが見つかりません');
  return getKpi(id);
}

export async function deleteKpi(id: number): Promise<void> {
  const affected = await db()('kpis').where({ id }).del();
  if (!affected) throw AppError.notFound('KPIが見つかりません');
}

async function getKpi(id: number): Promise<Kpi> {
  const row = await db()('kpis').where({ id }).first();
  if (!row) throw AppError.notFound('KPIが見つかりません');
  return mapKpi(row);
}

import type { Venue } from '@saiji/shared';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { mapVenue } from '../../utils/mappers.js';
import { insertId } from '../../utils/db.js';

export async function listVenues(onlyActive = false): Promise<Venue[]> {
  const q = db()('venues').orderBy('display_order').orderBy('id');
  if (onlyActive) q.where('status', 'active');
  return (await q).map(mapVenue);
}

export async function createVenue(input: {
  name: string;
  area?: string | null;
  status?: string;
  displayOrder?: number;
}): Promise<Venue> {
  const id = await insertId(
    db()('venues').insert({
      name: input.name,
      area: input.area ?? null,
      status: input.status ?? 'active',
      display_order: input.displayOrder ?? 0,
    }),
  );
  return getVenue(Number(id));
}

export async function updateVenue(
  id: number,
  input: Partial<{ name: string; area: string | null; status: string; displayOrder: number }>,
): Promise<Venue> {
  const patch: Record<string, unknown> = { updated_at: db().fn.now() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.area !== undefined) patch.area = input.area;
  if (input.status !== undefined) patch.status = input.status;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  const affected = await db()('venues').where({ id }).update(patch);
  if (!affected) throw AppError.notFound('会場が見つかりません');
  return getVenue(id);
}

export async function deleteVenue(id: number): Promise<void> {
  const affected = await db()('venues').where({ id }).del();
  if (!affected) throw AppError.notFound('会場が見つかりません');
}

async function getVenue(id: number): Promise<Venue> {
  const row = await db()('venues').where({ id }).first();
  if (!row) throw AppError.notFound('会場が見つかりません');
  return mapVenue(row);
}

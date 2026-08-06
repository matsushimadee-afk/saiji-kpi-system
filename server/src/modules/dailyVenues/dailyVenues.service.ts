import type { DailyVenue } from '@saiji/shared';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { insertId } from '../../utils/db.js';

function map(r: any): DailyVenue {
  return {
    id: r.id,
    date: String(r.entry_date).slice(0, 10),
    venueId: r.venue_id,
    venueName: r.venue_name,
    area: r.area ?? null,
    cost: r.cost ?? null,
    createdAt: r.created_at,
  };
}

/** 指定日の「本日の会場」一覧 */
export async function listForDate(date: string): Promise<DailyVenue[]> {
  const rows = await db()('daily_venues as dv')
    .join('venues as v', 'dv.venue_id', 'v.id')
    .where('dv.entry_date', date)
    .orderBy('v.display_order')
    .orderBy('v.id')
    .select('dv.id', 'dv.entry_date', 'dv.venue_id', 'dv.cost', 'dv.created_at', 'v.name as venue_name', 'v.area');
  return rows.map(map);
}

/** (日付, 会場) の設定を追加/更新（場所代） */
export async function upsert(
  date: string,
  venueId: number,
  cost: number | null,
  createdBy: number,
): Promise<DailyVenue> {
  const existing = await db()('daily_venues').where({ entry_date: date, venue_id: venueId }).first();
  if (existing) {
    await db()('daily_venues').where({ id: existing.id }).update({ cost, updated_at: db().fn.now() });
  } else {
    await insertId(db()('daily_venues').insert({ entry_date: date, venue_id: venueId, cost, created_by: createdBy }));
  }
  const row = await db()('daily_venues as dv')
    .join('venues as v', 'dv.venue_id', 'v.id')
    .where({ 'dv.entry_date': date, 'dv.venue_id': venueId })
    .select('dv.id', 'dv.entry_date', 'dv.venue_id', 'dv.cost', 'dv.created_at', 'v.name as venue_name', 'v.area')
    .first();
  if (!row) throw AppError.notFound('本日の会場が見つかりません');
  return map(row);
}

/** (日付, 会場) の設定を削除 */
export async function remove(date: string, venueId: number): Promise<void> {
  await db()('daily_venues').where({ entry_date: date, venue_id: venueId }).del();
}

/** (日付, 会場) の場所代を取得（日報用） */
export async function getCost(date: string, venueId: number): Promise<number | null> {
  const row = await db()('daily_venues').where({ entry_date: date, venue_id: venueId }).first();
  return row?.cost ?? null;
}

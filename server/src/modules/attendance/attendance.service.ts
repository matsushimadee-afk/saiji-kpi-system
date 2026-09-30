import type { DateAttendance, AttendanceMember } from '@saiji/shared';
import { db } from '../../config/database.js';
import { insertId } from '../../utils/db.js';

/** 指定日の会場ごとの出席状況＋チェックリスト用の全メンバーを返す */
export async function getDateAttendance(date: string): Promise<DateAttendance> {
  // その日に設定された会場（daily_venues）＋場所代
  const venues = await db()('daily_venues as dv')
    .join('venues as v', 'dv.venue_id', 'v.id')
    .where('dv.entry_date', date)
    .orderBy('v.display_order')
    .orderBy('v.id')
    .select('dv.venue_id as venueId', 'v.name as venueName', 'dv.cost as cost');

  // KPI入力者（その日その会場でカウントした人）
  const kpi = await db()('kpi_entries')
    .where({ entry_date: date, is_active: true })
    .whereNotNull('venue_id')
    .distinct('venue_id as venue_id', 'user_id as user_id');
  // 手動の上書き（present）
  const att = await db()('venue_attendance')
    .where({ entry_date: date })
    .select('venue_id as venue_id', 'user_id as user_id', 'present');

  // チェックリスト用の全メンバー（有効・管理者以外）
  const users = await db()('users')
    .where('status', 'active')
    .whereNot('role', 'admin')
    .orderBy('display_order')
    .orderBy('id')
    .select('id', 'display_name');

  const kpiSet = new Set((kpi as any[]).map((r) => `${r.venue_id}||${r.user_id}`));
  const overrideMap = new Map<string, boolean>();
  for (const r of att as any[]) {
    overrideMap.set(`${r.venue_id}||${r.user_id}`, r.present === true || r.present === 1);
  }

  const venuesOut = (venues as any[]).map((vn) => {
    const members: AttendanceMember[] = [];
    for (const u of users as any[]) {
      const k = `${vn.venueId}||${u.id}`;
      const hasKpi = kpiSet.has(k);
      const hasOverride = overrideMap.has(k);
      if (!hasKpi && !hasOverride) continue; // 何の状態も無い人は返さない（未出席扱い）
      const present = hasOverride ? overrideMap.get(k)! : hasKpi;
      members.push({ userId: u.id, name: u.display_name, present, hasKpi });
    }
    return { venueId: vn.venueId, venueName: vn.venueName, cost: vn.cost ?? null, members };
  });

  return {
    date,
    venues: venuesOut,
    allMembers: (users as any[]).map((u) => ({ id: u.id, name: u.display_name })),
  };
}

/**
 * (日付, 会場, 担当) の出席状態を設定する。
 * present=true: 場所代の対象に含める（入力漏れの追加）
 * present=false: 場所代の対象から外す（会場ミスの除外。KPI入力があっても外れる）
 */
export async function setAttendance(
  date: string,
  venueId: number,
  userId: number,
  present: boolean,
  createdBy: number,
): Promise<void> {
  const existing = await db()('venue_attendance')
    .where({ entry_date: date, venue_id: venueId, user_id: userId })
    .first();
  if (existing) {
    await db()('venue_attendance').where({ id: existing.id }).update({ present, updated_at: db().fn.now() });
  } else {
    await insertId(
      db()('venue_attendance').insert({ entry_date: date, venue_id: venueId, user_id: userId, present, created_by: createdBy }),
    );
  }
}

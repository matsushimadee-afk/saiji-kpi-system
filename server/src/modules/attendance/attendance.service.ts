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
  // 手動出席
  const att = await db()('venue_attendance')
    .where({ entry_date: date })
    .select('venue_id as venue_id', 'user_id as user_id');

  // チェックリスト用の全メンバー（有効・管理者以外）
  const users = await db()('users')
    .where('status', 'active')
    .whereNot('role', 'admin')
    .orderBy('display_order')
    .orderBy('id')
    .select('id', 'display_name');

  const kpiSet = new Set((kpi as any[]).map((r) => `${r.venue_id}||${r.user_id}`));
  const attSet = new Set((att as any[]).map((r) => `${r.venue_id}||${r.user_id}`));

  const venuesOut = (venues as any[]).map((vn) => {
    const members: AttendanceMember[] = [];
    for (const u of users as any[]) {
      const k = `${vn.venueId}||${u.id}`;
      const inK = kpiSet.has(k);
      const inA = attSet.has(k);
      if (!inK && !inA) continue;
      members.push({
        userId: u.id,
        name: u.display_name,
        source: inK && inA ? 'both' : inK ? 'kpi' : 'manual',
      });
    }
    return { venueId: vn.venueId, venueName: vn.venueName, cost: vn.cost ?? null, members };
  });

  return {
    date,
    venues: venuesOut,
    allMembers: (users as any[]).map((u) => ({ id: u.id, name: u.display_name })),
  };
}

/** (日付, 会場, 担当) の出席を追加（既にあれば何もしない） */
export async function addAttendance(date: string, venueId: number, userId: number, createdBy: number): Promise<void> {
  const existing = await db()('venue_attendance')
    .where({ entry_date: date, venue_id: venueId, user_id: userId })
    .first();
  if (existing) return;
  await insertId(
    db()('venue_attendance').insert({ entry_date: date, venue_id: venueId, user_id: userId, created_by: createdBy }),
  );
}

/** (日付, 会場, 担当) の手動出席を削除（KPI入力由来は消せない＝この行が無いだけ） */
export async function removeAttendance(date: string, venueId: number, userId: number): Promise<void> {
  await db()('venue_attendance').where({ entry_date: date, venue_id: venueId, user_id: userId }).del();
}

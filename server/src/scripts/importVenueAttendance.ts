import { closeDb, db } from '../config/database.js';
import { insertId } from '../utils/db.js';

/**
 * 過去の「入力漏れ」場所代を修正するための出席レコード一括取り込み。
 *   npx tsx src/scripts/importVenueAttendance.ts            ← 下見(ドライラン。書き込みなし)
 *   npx tsx src/scripts/importVenueAttendance.ts --apply    ← 実際に取り込む
 * 本番DBに対しては DB_CLIENT=pg DATABASE_URL=... を環境変数で渡す。
 *
 * 会場名は venues.name と完全一致で解決する。見つからない会場は取り込まず一覧に出す。
 * 場所代(daily_venues)がその日に未設定なら、会場マスタの基本場所代(cost)で作成する
 * （基本場所代も未設定なら会場日は作るが金額はnull＝要あとで設定）。
 */

// [担当者(display_name), 日付(YYYY-MM-DD), 会場名]
const RECORDS: Array<[string, string, string]> = [
  ['豊田匠', '2026-09-19', 'セブンパーク天美'],
  ['豊田匠', '2026-09-23', 'イオンモール今治'],
  ['松勢海努', '2026-09-15', 'ドンキホーテ名張'],
  ['松勢海努', '2026-09-22', 'イオンモール今治'],
  ['松勢海努', '2026-09-23', 'イオンモール今治'],
  ['松勢海努', '2026-09-26', 'イオンモール姫路大津'],
  ['松勢海努', '2026-09-27', 'イオンモール姫路大津'],
  ['村上紗香', '2026-09-02', 'フレンドタウン交野'],
  ['村上紗香', '2026-09-06', 'アルプラザ香里園'],
  ['村上紗香', '2026-09-15', 'MEGAドンキ名張'],
  ['村上紗香', '2026-09-17', 'MEGAドンキ名張'],
  ['村上紗香', '2026-09-20', 'セブンパーク天美'],
  ['村上紗香', '2026-09-21', 'イオンモール今治'],
  ['村上紗香', '2026-09-22', 'イオンモール今治'],
  ['村上紗香', '2026-09-23', 'イオンモール今治'],
  ['村上紗香', '2026-09-26', 'イオンモール姫路大津'],
];

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '=== 取り込み(--apply) ===' : '=== 下見(ドライラン: 書き込みなし) ===');

  const users = await db()('users').select('id', 'display_name');
  const userByName = new Map<string, number>((users as any[]).map((u) => [u.display_name, u.id]));
  const venues = await db()('venues').select('id', 'name', 'cost');
  const venueByName = new Map<string, { id: number; cost: number | null }>(
    (venues as any[]).map((v) => [v.name, { id: v.id, cost: v.cost ?? null }]),
  );

  const missingVenues = new Set<string>();
  const missingUsers = new Set<string>();
  const needCost = new Set<string>();
  let added = 0;
  let already = 0;

  for (const [name, date, venueName] of RECORDS) {
    const userId = userByName.get(name);
    const venue = venueByName.get(venueName);
    if (!userId) { missingUsers.add(name); console.log(`  NG 担当者未登録: ${name}  (${date} ${venueName})`); continue; }
    if (!venue) { missingVenues.add(venueName); console.log(`  NG 会場未登録: ${venueName}  (${date} ${name})`); continue; }

    // daily_venues（その日の会場＋場所代）
    const dv = await db()('daily_venues').where({ entry_date: date, venue_id: venue.id }).first();
    let costNote = '';
    if (!dv) {
      if (venue.cost == null) { needCost.add(`${date} ${venueName}`); costNote = ' [場所代未設定→要設定]'; }
      else costNote = ` [場所代 ${venue.cost}円(基本料金)を新規設定]`;
      if (apply) {
        await insertId(db()('daily_venues').insert({ entry_date: date, venue_id: venue.id, cost: venue.cost, created_by: null }));
      }
    } else if (dv.cost == null) {
      needCost.add(`${date} ${venueName}`); costNote = ' [場所代未設定→要設定]';
    } else {
      costNote = ` [場所代 ${dv.cost}円(設定済)]`;
    }

    // 出席
    const exists = await db()('venue_attendance').where({ entry_date: date, venue_id: venue.id, user_id: userId }).first();
    if (exists) { already++; console.log(`  = 既に出席あり: ${date} ${venueName} ${name}${costNote}`); continue; }
    if (apply) {
      await insertId(db()('venue_attendance').insert({ entry_date: date, venue_id: venue.id, user_id: userId, created_by: null }));
    }
    added++;
    console.log(`  ${apply ? 'OK 追加' : '＋追加予定'}: ${date} ${venueName} ${name}${costNote}`);
  }

  console.log('\n=== サマリー ===');
  console.log(`  ${apply ? '追加した出席' : '追加予定の出席'}: ${added} 件 / 既存: ${already} 件`);
  if (missingVenues.size) console.log(`  ★会場マスタに無い会場（要登録/名称確認）: ${[...missingVenues].join(' , ')}`);
  if (missingUsers.size) console.log(`  ★担当者名が一致しない: ${[...missingUsers].join(' , ')}`);
  if (needCost.size) console.log(`  ★場所代が未設定の会場日（要設定・アプリの「場所代修正」で）: ${[...needCost].join(' / ')}`);
  if (!apply) console.log('\n  ※これは下見です。問題なければ --apply を付けて実行すると取り込みます。');

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

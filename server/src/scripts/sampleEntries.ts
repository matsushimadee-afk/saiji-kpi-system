import { db, closeDb } from '../config/database.js';

/**
 * デモ用: 有効な営業担当に本日のファネル入力データを生成する（動作確認・デモ用）。
 * 既存の入力は一旦クリアして再生成する。実データ投入後は実行しないこと。
 *   npm run sample:entries
 */
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// KPIコード別の基準件数（ファネル）
const BASE: Record<string, number> = {
  catch: 100,
  power_hearing: 62,
  lottery: 41,
  survey: 29,
  negotiation: 16,
  company_intro: 11,
  order: 3,
};

async function main() {
  const knex = db();
  await knex.migrate.latest();

  const kpis = await knex('kpis').where('is_active', true);
  const salesUsers = await knex('users').where({ role: 'sales', status: 'active' });
  const venues = await knex('venues').where('status', 'active');

  if (salesUsers.length === 0) {
    console.log('営業担当がいません。先に `npm run sync:roster` を実行してください。');
    await closeDb();
    return;
  }

  await knex('kpi_entries').del();

  const entries: Array<Record<string, unknown>> = [];
  let seq = 0;
  salesUsers.forEach((u: any, idx: number) => {
    const factor = 0.7 + (idx % 5) * 0.1; // 0.7〜1.1
    const venue = venues[idx % Math.max(1, venues.length)];
    for (const k of kpis) {
      const base = BASE[k.code] ?? 5;
      const count = Math.max(0, Math.round(base * factor));
      for (let i = 0; i < count; i++) {
        const hour = 10 + (seq % 8);
        const minute = (seq * 13) % 60;
        entries.push({
          user_id: u.id,
          kpi_id: k.id,
          venue_id: venue?.id ?? null,
          department_id: u.department_id ?? null,
          team_id: u.team_id ?? null,
          amount: 1,
          entry_date: todayStr(),
          is_active: true,
          created_at: `${todayStr()} ${pad(hour)}:${pad(minute)}:00`,
        });
        seq++;
      }
    }
  });

  for (let i = 0; i < entries.length; i += 200) {
    await knex('kpi_entries').insert(entries.slice(i, i + 200));
  }
  console.log(`サンプル入力を生成しました: ${entries.length}件 / 営業${salesUsers.length}名`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { db, closeDb } from '../config/database.js';

/**
 * デモ用: 「実際に運用した数日ぶん」に見えるリアルな入力データを生成する。
 * - 担当者ごとに個性（ボリューム・転換率の得意/不得意）を持たせる
 * - 時間帯の波（昼〜夕方がピーク）を再現
 * - 直近の催事開催日ぶんを生成（当月タブも見栄えする）
 *
 * 既存の入力データは一度すべて削除してから生成する。
 * 本運用開始時は 管理者 → マスタ管理 → データ管理 → 全カウントをリセット で消せる。
 *
 *   npm run sample:entries
 */
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** 何日前かの日付 */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** 担当者ごとの個性（転換率は次の工程へ進む割合） */
interface Profile {
  volume: number; // キャッチ数のボリューム
  hearing: number;
  lottery: number;
  survey: number;
  nego: number;
  intro: number;
  order: number;
}
const PROFILES: Profile[] = [
  // エース: 数も質も高い
  { volume: 1.15, hearing: 0.66, lottery: 0.71, survey: 0.76, nego: 0.58, intro: 0.75, order: 0.22 },
  // 標準
  { volume: 1.0, hearing: 0.63, lottery: 0.67, survey: 0.72, nego: 0.55, intro: 0.7, order: 0.18 },
  // キャッチは得意だがクロージングが課題
  { volume: 1.08, hearing: 0.69, lottery: 0.73, survey: 0.75, nego: 0.51, intro: 0.67, order: 0.12 },
  // 数は少なめだが決める
  { volume: 0.84, hearing: 0.58, lottery: 0.64, survey: 0.7, nego: 0.49, intro: 0.65, order: 0.21 },
  // 平均的な新人
  { volume: 0.9, hearing: 0.6, lottery: 0.66, survey: 0.69, nego: 0.52, intro: 0.68, order: 0.14 },
];

const BASE_CATCH = 95;
const HOURS = [10, 11, 12, 13, 14, 15, 16, 17];
// 来場の波（昼〜夕方がピーク）
const HOUR_WEIGHTS = [0.55, 0.85, 1.15, 1.05, 1.35, 1.25, 0.95, 0.7];
// 生成する催事開催日（何日前か）: 今日 + 直近の開催日
const DAY_OFFSETS = [0, 1, 2, 7, 8];

/** ゆらぎ */
function jit(v: number, p = 0.08): number {
  return v * (1 + (Math.random() * 2 - 1) * p);
}

/** total 件を重み付けで時間帯に配分する */
function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map((v) => Math.floor(v));
  const rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rest; k++) out[order[k % order.length].i]++;
  return out;
}

async function main() {
  const knex = db();
  await knex.migrate.latest();

  const kpis = await knex('kpis').where('is_active', true);
  const idOf = (code: string): number | null => kpis.find((k: any) => k.code === code)?.id ?? null;

  // 現場で入力するのは 営業担当 と リーダー
  const members = await knex('users')
    .where({ status: 'active' })
    .whereIn('role', ['sales', 'leader'])
    .orderBy('display_order')
    .orderBy('id');
  const venues = await knex('venues').where('status', 'active').orderBy('display_order');

  if (members.length === 0) {
    console.log('営業担当がいません。先に `npm run sync:roster` を実行してください。');
    await closeDb();
    return;
  }

  await knex('kpi_entries').del();

  const entries: Array<Record<string, unknown>> = [];
  const summary: string[] = [];

  DAY_OFFSETS.forEach((offset, dayIdx) => {
    const date = dateStr(daysAgo(offset));
    // 催事は日ごとに会場が変わる想定（全員同じ会場）
    const venue = venues.length ? venues[dayIdx % venues.length] : null;
    // 日ごとの客入り
    const dayFactor = jit(offset === 0 ? 1.0 : 0.9 + (dayIdx % 3) * 0.1, 0.1);
    let dayCatch = 0;
    let dayOrder = 0;

    members.forEach((u: any, i: number) => {
      const p = PROFILES[i % PROFILES.length];
      const counts: Record<string, number> = {};
      counts.catch = Math.max(20, Math.round(BASE_CATCH * p.volume * dayFactor * jit(1)));
      counts.power_hearing = Math.round(counts.catch * jit(p.hearing));
      counts.lottery = Math.round(counts.power_hearing * jit(p.lottery));
      counts.survey = Math.round(counts.lottery * jit(p.survey));
      counts.negotiation = Math.round(counts.survey * jit(p.nego));
      counts.company_intro = Math.round(counts.negotiation * jit(p.intro));
      counts.order = Math.round(counts.negotiation * jit(p.order));
      dayCatch += counts.catch;
      dayOrder += counts.order;

      for (const [code, total] of Object.entries(counts)) {
        const kpiId = idOf(code);
        if (!kpiId || total <= 0) continue;
        const perHour = distribute(total, HOUR_WEIGHTS);
        perHour.forEach((n, hIdx) => {
          for (let k = 0; k < n; k++) {
            const minute = Math.floor(Math.random() * 60);
            entries.push({
              user_id: u.id,
              kpi_id: kpiId,
              venue_id: venue?.id ?? null,
              department_id: u.department_id ?? null,
              team_id: u.team_id ?? null,
              amount: 1,
              entry_date: date,
              is_active: true,
              created_at: `${date} ${pad(HOURS[hIdx])}:${pad(minute)}:00`,
            });
          }
        });
      }
    });
    summary.push(`  ${date} @${venue?.name ?? '—'} : キャッチ ${dayCatch} / 受注 ${dayOrder}`);
  });

  for (let i = 0; i < entries.length; i += 300) {
    await knex('kpi_entries').insert(entries.slice(i, i + 300));
  }

  console.log(`デモデータを生成しました: ${entries.length}件 / ${members.length}名 / ${DAY_OFFSETS.length}日ぶん`);
  summary.forEach((s) => console.log(s));
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

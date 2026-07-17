/**
 * 日付・時刻ユーティリティ。
 *
 * 重要: サーバー(Render等)は UTC で動くことが多いため、
 * 「業務日」「時間帯」は必ず業務タイムゾーン(既定 Asia/Tokyo)で計算する。
 * 保存する時刻は UTC の ISO 文字列（＝正しい瞬間）にして、DB や
 * サーバーの TZ 設定に左右されないようにする。
 */

/** 業務タイムゾーン */
const TZ = process.env.APP_TZ ?? 'Asia/Tokyo';

// en-CA ロケールは YYYY-MM-DD 形式になる
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
// h23 = 0〜23 表記
const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  hourCycle: 'h23',
});

/** 業務日 YYYY-MM-DD (Asia/Tokyo 基準) */
export function todayDate(): string {
  return dateFormatter.format(new Date());
}

/** 当月 YYYY-MM (Asia/Tokyo 基準) */
export function currentMonth(): string {
  return todayDate().slice(0, 7);
}

/** DB保存用の時刻。UTCのISO文字列なので、どのDB/TZでも同じ瞬間を指す */
export function nowIso(): string {
  return new Date().toISOString();
}

/** created_at (Date または文字列) から業務TZの時(0-23)を取り出す */
export function extractHour(createdAt: unknown): number {
  const d = createdAt instanceof Date ? createdAt : new Date(String(createdAt));
  if (Number.isNaN(d.getTime())) return 0;
  return Number(hourFormatter.format(d));
}

/** YYYY-MM-DD の妥当性チェック */
export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** YYYY-MM の妥当性チェック */
export function isValidMonth(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s);
}

/** 月 (YYYY-MM) の開始日・終了日(排他, 翌月1日) を返す */
export function monthRange(month: string): { start: string; endExclusive: string } {
  const [y, m] = month.split('-').map(Number);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const start = `${y}-${pad(m)}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  return { start, endExclusive: `${nextY}-${pad(nextM)}-01` };
}

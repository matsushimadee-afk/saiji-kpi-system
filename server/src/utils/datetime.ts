function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** ローカル日付 YYYY-MM-DD */
export function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ローカル月 YYYY-MM */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** ローカルの現在時刻 YYYY-MM-DD HH:MM:SS (時間帯別集計をローカル時刻で行うため) */
export function nowTimestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** created_at (文字列 or Date) からローカル時 (0-23) を取り出す */
export function extractHour(createdAt: unknown): number {
  if (createdAt instanceof Date) return createdAt.getHours();
  const s = String(createdAt);
  const m = s.match(/[ T](\d{2}):/);
  return m ? Number(m[1]) : 0;
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
  const start = `${y}-${pad(m)}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const endExclusive = `${nextY}-${pad(nextM)}-01`;
  return { start, endExclusive };
}

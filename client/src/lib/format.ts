/** 数値をカンマ区切りに */
export function formatNumber(n: number): string {
  return n.toLocaleString('ja-JP');
}

/** 達成率を 0-100 に丸めて進捗バー幅に使う */
export function clampPercent(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0) return 0;
  return Math.min(100, rate);
}

/** 達成率に応じた状態カラー (CSS変数) */
export function rateColor(rate: number): string {
  if (rate >= 100) return 'var(--success)';
  if (rate >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

/** 今日の日付 YYYY-MM-DD (ローカル) */
export function todayStr(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 現在の月 YYYY-MM (ローカル) */
export function currentMonthStr(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`;
}

/** 順位に応じたメダル絵文字 (1-3位) */
export function medal(rank: number): string {
  return ['🥇', '🥈', '🥉'][rank] ?? '';
}

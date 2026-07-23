/**
 * アプリのアップデート情報（お知らせ）。
 *
 * ▼ 新しいお知らせを追加するとき
 *   この配列の先頭に 1 件足すだけです（新しい順に上へ）。
 *   date は 'YYYY-MM-DD'、tags は付けたいものだけ。items に箇条書きを並べます。
 *   ビルドし直せば「使い方」ページの先頭に自動で表示されます。
 */

export type ChangeTag = 'NEW' | '改善' | '修正';

export interface ChangelogEntry {
  /** 'YYYY-MM-DD' */
  date: string;
  title: string;
  tags?: ChangeTag[];
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-07-23',
    title: 'キントーン日報連携と分析機能を追加',
    tags: ['NEW'],
    items: [
      '入力画面の一番下の「📝 日報を提出する」で、その日の数値をキントーンの日報にワンタップで提出できるようになりました。',
      '担当ごと・全体の数値を推移グラフで確認できる「分析ページ」を追加しました（責任者・リーダー向け）。',
      'カウンターの数値をCSVでダウンロードできるようになりました（責任者・リーダー向け）。',
      '日報の「名前」欄に使うキントーン名は、名簿シートから自動で取り込むようにしました。',
    ],
  },
];

/** 新しい順（日付の降順）に並べ替えて返す */
export function sortedChangelog(): ChangelogEntry[] {
  return [...CHANGELOG].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** '2026-07-23' → '2026年7月23日' */
export function formatChangeDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

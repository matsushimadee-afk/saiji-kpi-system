import { writeFileSync } from 'node:fs';
import type { AuthUser } from '@saiji/shared';
import { closeDb } from '../config/database.js';
import { currentMonth, isValidDate, monthRange, todayDate } from '../utils/datetime.js';
import { buildVenueCostSummaryCsv } from '../modules/stats/stats.service.js';

/**
 * 場所代（担当者ごと合計）CSVをファイルへ出力する CLI。
 * 日次バッチ（OneDrive同期フォルダへの書き出し）から使う想定。
 *
 *   npx tsx src/scripts/exportVenueCostSummary.ts <出力ファイルパス> [from(YYYY-MM-DD)] [to(YYYY-MM-DD)]
 *
 * from/to 省略時は当月（月初〜本日）。
 * 本番DBを読む場合は環境変数 DB_CLIENT=pg DATABASE_URL=... DB_SSL=true を渡す。
 */
const systemAdmin: AuthUser = {
  id: 0,
  employeeId: 'system',
  name: 'system',
  displayName: 'system',
  role: 'admin',
  departmentId: null,
  departmentName: null,
  teamId: null,
};

async function main(): Promise<void> {
  const [outPath, fromArg, toArg] = process.argv.slice(2);
  if (!outPath) {
    console.error('使い方: tsx src/scripts/exportVenueCostSummary.ts <出力ファイルパス> [from] [to]');
    process.exit(1);
  }
  const { start } = monthRange(currentMonth());
  const from = fromArg && isValidDate(fromArg) ? fromArg : start;
  const to = toArg && isValidDate(toArg) ? toArg : todayDate();

  const csv = await buildVenueCostSummaryCsv(systemAdmin, from, to);
  writeFileSync(outPath, csv, 'utf8'); // 先頭BOM込みでUTF-8保存
  const rows = csv.split('\r\n').length - 1; // ヘッダー除く概算
  console.log(`OK: ${outPath} を書き出しました（期間 ${from} 〜 ${to} / データ ${rows}行）`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

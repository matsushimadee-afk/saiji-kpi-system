import { writeFileSync } from 'node:fs';
import type { AuthUser } from '@saiji/shared';
import { closeDb } from '../config/database.js';
import { isValidDate } from '../utils/datetime.js';
import { buildVenueCostDetailCsv } from '../modules/stats/stats.service.js';

/**
 * 場所代（日別明細）CSVをファイルへ出力する CLI。
 * 既定は全期間（ALL）。月末締めの直前に月が変わっても過去月分が消えないよう、
 * 日次バッチではこの全期間版を別ファイルに出しておく。
 *
 *   npx tsx src/scripts/exportVenueCostDetail.ts <出力ファイルパス> [from(YYYY-MM-DD)] [to(YYYY-MM-DD)]
 *
 * from/to 省略時は全期間（2000-01-01〜2999-12-31）。
 * 本番DBを読む場合は環境変数 DB_CLIENT=pg DATABASE_URL=... を渡す。
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
    console.error('使い方: tsx src/scripts/exportVenueCostDetail.ts <出力ファイルパス> [from] [to]');
    process.exit(1);
  }
  // 既定は全期間
  const from = fromArg && isValidDate(fromArg) ? fromArg : '2000-01-01';
  const to = toArg && isValidDate(toArg) ? toArg : '2999-12-31';

  const csv = await buildVenueCostDetailCsv(systemAdmin, from, to);
  writeFileSync(outPath, csv, 'utf8'); // 先頭BOM込みでUTF-8保存
  const rows = csv.split('\r\n').length - 1; // ヘッダー除く概算
  console.log(`OK: ${outPath} を書き出しました（期間 ${from} 〜 ${to} / 明細 ${rows}行）`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

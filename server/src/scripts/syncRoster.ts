import { db, closeDb } from '../config/database.js';
import { syncRoster } from '../modules/roster/roster.service.js';

/**
 * 名簿(Googleシート)同期のブートストラップ用CLI。
 * Googleログイン導入直後、まだ誰もログインできない状態で最初の取込に使う。
 *   npm run sync:roster
 */
async function main() {
  await db().migrate.latest();
  const r = await syncRoster();
  console.log(`同期完了: 新規 ${r.created} / 更新 ${r.updated} / 無効化 ${r.deactivated}（対象 ${r.fetchedRows} 名）`);
  for (const p of r.people) {
    console.log(`  - [${p.action}] ${p.name} <${p.email}> ${p.role} ${p.status}`);
  }
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

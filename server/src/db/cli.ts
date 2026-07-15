import { db, closeDb } from '../config/database.js';

/**
 * DB 操作 CLI (tsx から実行)。
 *   migrate : 最新までマイグレーション
 *   seed    : シード投入
 *   reset   : 全ロールバック → マイグレーション → シード (開発用の作り直し)
 */
async function main() {
  const cmd = process.argv[2];
  const knex = db();
  try {
    switch (cmd) {
      case 'migrate': {
        const [, log] = await knex.migrate.latest();
        console.log(log.length ? `適用: ${log.join(', ')}` : '適用済みのマイグレーションはありません');
        break;
      }
      case 'seed': {
        await knex.seed.run();
        console.log('シード投入完了');
        break;
      }
      case 'reset': {
        await knex.migrate.rollback(undefined, true);
        await knex.migrate.latest();
        await knex.seed.run();
        console.log('DB を初期化しました (migrate + seed)');
        break;
      }
      default:
        console.error('使い方: tsx src/db/cli.ts <migrate|seed|reset>');
        process.exit(1);
    }
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

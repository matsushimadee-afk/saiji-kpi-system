import { createServer } from 'node:http';
import { createApp } from './app.js';
import { initSocket } from './realtime/socket.js';
import { env } from './config/env.js';
import { closeDb, db } from './config/database.js';
import { syncRoster } from './modules/roster/roster.service.js';

/**
 * 初回起動時、DBが空(KPI 0件)なら初期データを投入する。
 * シェルの無いホスティング(Render無料等)でも自動でセットアップされる。
 * 2回目以降はデータがあるためスキップ。
 */
async function ensureSeeded() {
  const row = await db()('kpis').count({ c: '*' }).first();
  const count = Number((row as { c?: number | string } | undefined)?.c ?? 0);
  if (count > 0) return;
  // eslint-disable-next-line no-console
  console.log('[bootstrap] 空のDBを検出 → 初期データを投入します');
  await db().seed.run();
  try {
    const r = await syncRoster();
    // eslint-disable-next-line no-console
    console.log(`[bootstrap] 名簿同期: 新規 ${r.created} 名`);
  } catch (e) {
    // 名簿同期に失敗しても起動は継続（管理画面から後で実行可）
    // eslint-disable-next-line no-console
    console.warn('[bootstrap] 名簿同期はスキップ:', (e as Error).message);
  }
}

async function bootstrap() {
  // マイグレーション未適用でも起動できるよう、起動時に latest を実行
  await db().migrate.latest();
  await ensureSeeded();

  const app = createApp();
  const server = createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] http://localhost:${env.port} (client: ${env.clientOrigins.join(', ')})`);
  });

  const shutdown = async () => {
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] 起動に失敗しました', err);
  process.exit(1);
});

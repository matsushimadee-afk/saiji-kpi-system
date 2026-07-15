import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Express アプリケーションを組み立てる。
 * 本番(SERVE_CLIENT=true or NODE_ENV=production)ではビルド済みフロントも配信し、
 * 「1サービス」でデプロイできるようにする（フロントは同一オリジンの /api を叩く）。
 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigins.length ? env.clientOrigins : true, credentials: true }));
  app.use(express.json());
  // Google ログイン(redirectモード)の戻り(フォームPOST)を受け取るため
  app.use(express.urlencoded({ extended: false }));

  // ヘルスチェック
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // API
  app.use('/api', apiRouter);
  // 未定義の API は 404(JSON)
  app.use('/api', notFoundHandler);

  // ビルド済みフロントの配信（本番）
  const clientDist = path.resolve(process.cwd(), env.clientDist);
  const serveClient = (env.isProduction || process.env.SERVE_CLIENT === 'true') && fs.existsSync(clientDist);
  if (serveClient) {
    app.use(express.static(clientDist));
    // SPA フォールバック（/api・/socket.io 以外は index.html を返す）
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  } else {
    app.use(notFoundHandler);
  }

  app.use(errorHandler);
  return app;
}

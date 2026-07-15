import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SOCKET_EVENTS, type KpiUpdatePayload } from '@saiji/shared';
import { env } from '../config/env.js';

let io: SocketServer | null = null;

/**
 * Socket.io を初期化する。
 * ハンドシェイク時に JWT を検証し、未認証接続を拒否する。
 * 集計そのものは REST で権限制御しているため、更新通知はブロードキャストで足りる
 * (クライアントは通知を受けて自分の権限に応じた集計を再取得する)。
 */
export function initSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: { origin: env.clientOrigins.length ? env.clientOrigins : true, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      socket.data.user = jwt.verify(token, env.jwtSecret);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  return io;
}

/** KPI 更新をクライアントへ通知する */
export function emitKpiUpdate(payload: KpiUpdatePayload): void {
  io?.emit(SOCKET_EVENTS.KPI_UPDATE, payload);
}

import { io, type Socket } from 'socket.io-client';
import { getToken } from '@/api/token';

let socket: Socket | null = null;

/** アプリ共有の Socket.io 接続 (同一オリジン、Vite プロキシ経由) */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      auth: { token: getToken() },
      autoConnect: true,
      reconnectionDelay: 800,
    });
  }
  return socket;
}

/** ログイン/ログアウト後にトークンを更新して再接続する */
export function refreshSocketAuth(): void {
  if (socket) {
    socket.auth = { token: getToken() };
    socket.disconnect().connect();
  }
}

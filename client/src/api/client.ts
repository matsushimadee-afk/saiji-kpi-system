import axios, { AxiosError } from 'axios';
import type { ApiError } from '@saiji/shared';
import { clearToken, getToken } from './token';

/** 共有 axios インスタンス。ベース URL は Vite プロキシ経由の /api。 */
export const api = axios.create({
  baseURL: '/api',
});

// リクエストごとに Bearer トークンを付与
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 は自動ログアウト
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      clearToken();
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** API エラーから日本語メッセージを取り出す */
export function getErrorMessage(error: unknown, fallback = 'エラーが発生しました'): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as ApiError | undefined)?.error?.message ?? fallback;
  }
  return fallback;
}

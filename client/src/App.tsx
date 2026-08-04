import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { setToken } from '@/api/token';
import { router } from './router';

/**
 * Google ログイン(redirectモード)からの戻り。
 * 成功時: サーバーが `/#token=<JWT>` へ戻すので取り込んで保存。
 * 失敗時: サーバーが `/#login_error=<メッセージ>` へ戻すので、ログイン画面で表示できるよう控える。
 * いずれもURLからは消す。
 */
(function pickUpFromHash() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  const clearHash = () =>
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  if (hash.startsWith('#token=')) {
    const token = decodeURIComponent(hash.slice('#token='.length));
    if (token) setToken(token);
    clearHash();
  } else if (hash.startsWith('#login_error=')) {
    const message = decodeURIComponent(hash.slice('#login_error='.length));
    if (message) sessionStorage.setItem('login_error', message);
    clearHash();
  }
})();

export function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

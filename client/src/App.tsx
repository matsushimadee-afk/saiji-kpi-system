import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { setToken } from '@/api/token';
import { router } from './router';

/**
 * Google ログイン(redirectモード)からの戻り。
 * サーバーが `/#token=<JWT>` へリダイレクトしてくるので、
 * アプリ起動時に一度だけ取り込んで保存し、URLからは消す。
 */
(function pickUpTokenFromHash() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (hash.startsWith('#token=')) {
    const token = decodeURIComponent(hash.slice('#token='.length));
    if (token) setToken(token);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
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

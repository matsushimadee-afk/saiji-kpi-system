import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { router } from './router';

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

import { create } from 'zustand';
import type { AuthUser } from '@saiji/shared';
import { authApi } from '@/api/endpoints';
import { clearToken, getToken, setToken } from '@/api/token';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  /** アプリ起動時: 保存済みトークンからセッションを復元 */
  init: () => Promise<void>;
  login: (employeeId: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  init: async () => {
    if (!getToken()) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, status: 'authenticated' });
    } catch {
      clearToken();
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async (employeeId, password) => {
    const { token, user } = await authApi.login({ employeeId, password });
    setToken(token);
    set({ user, status: 'authenticated' });
  },

  loginWithGoogle: async (credential) => {
    const { token, user } = await authApi.google(credential);
    setToken(token);
    set({ user, status: 'authenticated' });
  },

  logout: () => {
    clearToken();
    set({ user: null, status: 'unauthenticated' });
  },
}));

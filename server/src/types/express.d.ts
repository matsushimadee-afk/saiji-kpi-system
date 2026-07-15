import type { AuthUser } from '@saiji/shared';

declare global {
  namespace Express {
    interface Request {
      /** authenticate ミドルウェアで設定される認証済みユーザー */
      user?: AuthUser;
    }
  }
}

export {};

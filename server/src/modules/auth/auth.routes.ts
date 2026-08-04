import { Router } from 'express';
import { z } from 'zod';
import type { LoginResponse } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate, requireUser, signToken } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { login, loginWithGoogle } from './auth.service.js';
import { isEnabled as isKintoneEnabled } from '../kintone/kintone.service.js';

/** Cookie ヘッダから指定名の値を取り出す */
function getCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

const loginSchema = z.object({
  employeeId: z.string().min(1),
  password: z.string().min(1),
});

const googleSchema = z.object({
  credential: z.string().min(1),
});

export const authRouter = Router();

// クライアントが Google ログインの有効可否 / Client ID を取得する（公開）
authRouter.get('/config', (_req, res) => {
  res.json({
    googleEnabled: Boolean(env.googleClientId),
    googleClientId: env.googleClientId,
    kintoneEnabled: isKintoneEnabled(),
  });
});

// Google ログイン (popup モード用。JSがcredentialを受け取り送信)
authRouter.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { credential } = parse(googleSchema, req.body);
    const user = await loginWithGoogle(credential);
    const body: LoginResponse = { token: signToken(user), user };
    res.json(body);
  }),
);

// Google ログイン (redirect モード): Google がここへ id_token をフォームPOSTする。
// モバイルSafari等でも確実に動くよう、同一タブのリダイレクトで完結させる。
//
// 重要: このエンドポイントは「全画面遷移のPOST」で叩かれる。ここで例外を投げると
// ブラウザには生のJSONエラーが表示され、ユーザーが行き止まりになる（通信が不安定な時に
// g_csrf_token が食い違うと発生していた）。そのため失敗時も必ずログイン画面へ戻す。
authRouter.post(
  '/google/callback',
  asyncHandler(async (req, res) => {
    // エラー時: 古い g_csrf_token を消してからログイン画面へ戻す（再試行がクリーンに始まる）
    const backToLogin = (message: string) => {
      res.setHeader('Set-Cookie', 'g_csrf_token=; Path=/; Max-Age=0; SameSite=None; Secure');
      res.redirect(`/#login_error=${encodeURIComponent(message)}`);
    };

    try {
      // CSRF (double-submit cookie)。両方あって食い違う時のみ失敗扱い。
      const bodyCsrf = req.body?.g_csrf_token as string | undefined;
      const cookieCsrf = getCookie(req.headers.cookie, 'g_csrf_token');
      if (bodyCsrf && cookieCsrf && bodyCsrf !== cookieCsrf) {
        backToLogin('通信が不安定でした。お手数ですが、もう一度ログインしてください。');
        return;
      }
      const credential = req.body?.credential as string | undefined;
      if (!credential) {
        backToLogin('ログイン情報を受け取れませんでした。もう一度お試しください。');
        return;
      }

      const user = await loginWithGoogle(credential);
      const token = signToken(user);
      // SPA へ戻す (トークンは URL ハッシュで渡し、クライアントが保存する)
      res.redirect(`/#token=${encodeURIComponent(token)}`);
    } catch (err) {
      // 名簿未登録・退職などのメッセージはそのまま見せる。それ以外は汎用文言。
      const message =
        err instanceof AppError ? err.message : 'ログインに失敗しました。もう一度お試しください。';
      backToLogin(message);
    }
  }),
);

// 社員ID/パスワード ログイン（管理者の緊急用）
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { employeeId, password } = parse(loginSchema, req.body);
    const user = await login(employeeId, password);
    const body: LoginResponse = { token: signToken(user), user };
    res.json(body);
  }),
);

// 現在のユーザー
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: requireUser(req) });
  }),
);

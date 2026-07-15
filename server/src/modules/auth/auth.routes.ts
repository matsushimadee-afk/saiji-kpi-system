import { Router } from 'express';
import { z } from 'zod';
import type { LoginResponse } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate, requireUser, signToken } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { login, loginWithGoogle } from './auth.service.js';

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
  res.json({ googleEnabled: Boolean(env.googleClientId), googleClientId: env.googleClientId });
});

// Google ログイン
authRouter.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { credential } = parse(googleSchema, req.body);
    const user = await loginWithGoogle(credential);
    const body: LoginResponse = { token: signToken(user), user };
    res.json(body);
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

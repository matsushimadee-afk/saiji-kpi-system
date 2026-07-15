import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@saiji/shared';
import { AppError } from '../utils/AppError.js';

/** 一元的なエラーハンドラ。AppError / ZodError / その他 を整形して返す。 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiError = {
      error: { message: err.message, code: err.code, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiError = {
      error: { message: '入力値が不正です', code: 'VALIDATION_ERROR', details: err.flatten() },
    };
    res.status(400).json(body);
    return;
  }

  // 想定外エラー
  // eslint-disable-next-line no-console
  console.error('[UnhandledError]', err);
  const body: ApiError = { error: { message: 'サーバー内部エラーが発生しました' } };
  res.status(500).json(body);
}

/** 未定義ルート用 404 */
export function notFoundHandler(_req: Request, res: Response): void {
  const body: ApiError = { error: { message: 'エンドポイントが見つかりません', code: 'NOT_FOUND' } };
  res.status(404).json(body);
}

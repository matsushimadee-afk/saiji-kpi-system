import type { ZodSchema } from 'zod';
import { AppError } from './AppError.js';

/** zod スキーマで検証し、失敗時は 400 の AppError を投げる */
export function parse<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.badRequest('入力値が不正です', result.error.flatten());
  }
  return result.data;
}

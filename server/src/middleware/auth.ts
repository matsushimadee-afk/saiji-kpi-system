import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser } from '@saiji/shared';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export type JwtPayload = AuthUser & { iat: number; exp: number };

/** 署名付き JWT を発行する */
export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });
}

/** Authorization: Bearer <token> を検証し req.user を設定する */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }
  const token = header.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: decoded.id,
      employeeId: decoded.employeeId,
      name: decoded.name,
      displayName: decoded.displayName,
      role: decoded.role,
      departmentId: decoded.departmentId ?? null,
      departmentName: decoded.departmentName ?? null,
      teamId: decoded.teamId ?? null,
    };
    next();
  } catch {
    throw AppError.unauthorized('トークンが無効か有効期限切れです');
  }
}

/** 認証済みユーザーを型安全に取得する */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

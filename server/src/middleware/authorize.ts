import { NextFunction, Request, Response } from 'express';
import type { Role } from '@saiji/shared';
import { AppError } from '../utils/AppError.js';

/** 指定した権限のいずれかを持つユーザーのみ許可する */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw AppError.unauthorized();
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw AppError.forbidden();
    }
    next();
  };
}

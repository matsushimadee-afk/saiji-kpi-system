import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { syncRoster } from './roster.service.js';

export const rosterRouter = Router();
rosterRouter.use(authenticate);

// 名簿(Googleシート)から同期（管理者のみ）
rosterRouter.post(
  '/sync',
  authorize('admin'),
  asyncHandler(async (_req, res) => {
    res.json(await syncRoster());
  }),
);

import { Router } from 'express';
import { MASTER_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { syncRoster } from './roster.service.js';

export const rosterRouter = Router();
rosterRouter.use(authenticate);

// 名簿(Googleシート)から同期（マスタ権限）
rosterRouter.post(
  '/sync',
  authorize(...MASTER_ROLES),
  asyncHandler(async (_req, res) => {
    res.json(await syncRoster());
  }),
);

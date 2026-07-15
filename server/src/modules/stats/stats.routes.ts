import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { currentMonth, isValidDate, isValidMonth, todayDate } from '../../utils/datetime.js';
import * as stats from './stats.service.js';

export const statsRouter = Router();
statsRouter.use(authenticate);

// デイリーダッシュボード (責任者・管理者)
statsRouter.get(
  '/daily',
  authorize('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const date = typeof req.query.date === 'string' && isValidDate(req.query.date) ? req.query.date : todayDate();
    res.json(await stats.getDailyStats(me, date));
  }),
);

// 当月ダッシュボード (責任者・管理者)
statsRouter.get(
  '/monthly',
  authorize('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const month = typeof req.query.month === 'string' && isValidMonth(req.query.month) ? req.query.month : currentMonth();
    res.json(await stats.getMonthlyStats(me, month));
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { DASHBOARD_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { todayDate, isValidDate } from '../../utils/datetime.js';
import * as daily from './dailyVenues.service.js';

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  venueId: z.number().int(),
  cost: z.number().int().min(0).nullable().optional(),
});

export const dailyVenuesRouter = Router();
dailyVenuesRouter.use(authenticate);

// 指定日の本日の会場一覧（全ロール。メンバーも自分の会場を選ぶため閲覧）
dailyVenuesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' && isValidDate(req.query.date) ? req.query.date : todayDate();
    res.json({ data: await daily.listForDate(date) });
  }),
);

// 本日の会場を設定/更新（リーダー・責任者・管理者）
dailyVenuesRouter.post(
  '/',
  authorize(...DASHBOARD_ROLES),
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const body = parse(upsertSchema, req.body);
    const date = body.date && isValidDate(body.date) ? body.date : todayDate();
    res.json(await daily.upsert(date, body.venueId, body.cost ?? null, me.id));
  }),
);

// 本日の会場から外す（リーダー・責任者・管理者）
dailyVenuesRouter.delete(
  '/',
  authorize(...DASHBOARD_ROLES),
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' && isValidDate(req.query.date) ? req.query.date : todayDate();
    const venueId = Number(req.query.venueId);
    await daily.remove(date, venueId);
    res.status(204).end();
  }),
);

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { todayDate, isValidDate } from '../../utils/datetime.js';
import * as kintone from './kintone.service.js';

export const kintoneRouter = Router();
kintoneRouter.use(authenticate);

// 日報を提出（当日の自分の数値をキントーンにレコード追加し、編集画面URLを返す）
kintoneRouter.post(
  '/daily-report',
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const date = typeof req.body?.date === 'string' && isValidDate(req.body.date) ? req.body.date : todayDate();
    const pick = (v: unknown) => (typeof v === 'string' ? v.slice(0, 2000) : undefined);
    const rawNotes = (req.body?.notes ?? {}) as Record<string, unknown>;
    const notes = {
      strategy: pick(rawNotes.strategy),
      roleplay: pick(rawNotes.roleplay),
      kpiThoughts: pick(rawNotes.kpiThoughts),
    };
    const venueCost = pick(req.body?.venueCost);
    res.json(await kintone.submitDailyReport(me, date, notes, venueCost));
  }),
);

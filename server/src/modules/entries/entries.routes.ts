import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { todayDate, isValidDate } from '../../utils/datetime.js';
import { emitKpiUpdate } from '../../realtime/socket.js';
import * as entries from './entries.service.js';

const createSchema = z.object({
  kpiId: z.number().int(),
  venueId: z.number().int().nullable().optional(),
});

export const entriesRouter = Router();
entriesRouter.use(authenticate);

// KPI 入力 (+1)
entriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const input = parse(createSchema, req.body);
    const { entryId, payload } = await entries.createEntry(me, input);
    emitKpiUpdate(payload); // リアルタイム通知
    res.status(201).json({ entryId, entryDate: payload.entryDate });
  }),
);

// 直前の入力を取り消す (Undo)
entriesRouter.post(
  '/undo',
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const { entryId, payload } = await entries.undoLast(me);
    emitKpiUpdate(payload);
    res.json({ entryId, undone: true });
  }),
);

// 自分の当日サマリ (営業担当画面)
entriesRouter.get(
  '/summary/me',
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const date = typeof req.query.date === 'string' && isValidDate(req.query.date) ? req.query.date : todayDate();
    res.json(await entries.getMySummary(me, date));
  }),
);

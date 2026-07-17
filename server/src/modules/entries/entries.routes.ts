import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { todayDate, isValidDate, currentMonth } from '../../utils/datetime.js';
import { emitKpiUpdate } from '../../realtime/socket.js';
import * as entries from './entries.service.js';

const createSchema = z.object({
  kpiId: z.number().int(),
  venueId: z.number().int().nullable().optional(),
});

const resetSchema = z.object({
  /** この日より前を削除 (YYYY-MM-DD)。未指定なら全期間 */
  before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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

// カウントをリセット (管理者のみ)
// body.before を指定すると「その日より前」だけ削除（当日の入力は残る）
entriesRouter.post(
  '/reset',
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { before } = parse(resetSchema, req.body ?? {});
    const deleted = await entries.resetEntries(before);
    // 開いているダッシュボードを更新させる
    emitKpiUpdate({
      type: 'undone',
      entryId: 0,
      userId: 0,
      kpiId: 0,
      venueId: null,
      departmentId: null,
      entryDate: todayDate(),
      month: currentMonth(),
    });
    res.json({ deleted });
  }),
);

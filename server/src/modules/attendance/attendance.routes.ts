import { Router } from 'express';
import { z } from 'zod';
import { MASTER_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { parse } from '../../utils/validate.js';
import { isValidDate, todayDate } from '../../utils/datetime.js';
import * as attendance from './attendance.service.js';

// 出席（場所代の頭割り対象）の編集。責任者・リーダー・管理者のみ。
export const attendanceRouter = Router();
attendanceRouter.use(authenticate);
attendanceRouter.use(authorize(...MASTER_ROLES));

// 指定日の会場ごとの出席状況＋全メンバー
attendanceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' && isValidDate(req.query.date) ? req.query.date : todayDate();
    res.json(await attendance.getDateAttendance(date));
  }),
);

const upsertSchema = z.object({
  date: z.string().refine(isValidDate, '日付が不正です'),
  venueId: z.number().int(),
  userId: z.number().int(),
});

// 出席を追加
attendanceRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const { date, venueId, userId } = parse(upsertSchema, req.body);
    await attendance.addAttendance(date, venueId, userId, me.id);
    res.status(201).json({ ok: true });
  }),
);

// 手動出席を削除（クエリ: date, venueId, userId）
attendanceRouter.delete(
  '/',
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    const venueId = Number(req.query.venueId);
    const userId = Number(req.query.userId);
    if (!isValidDate(date) || !venueId || !userId) {
      res.status(400).json({ error: 'パラメータが不正です' });
      return;
    }
    await attendance.removeAttendance(date, venueId, userId);
    res.status(204).end();
  }),
);

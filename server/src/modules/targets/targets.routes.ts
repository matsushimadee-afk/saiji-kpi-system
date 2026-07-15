import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import * as targets from './targets.service.js';

const scopeEnum = z.enum(['overall', 'department', 'team', 'user', 'venue']);
const periodEnum = z.enum(['daily', 'monthly']);

const upsertSchema = z.object({
  periodType: periodEnum,
  scope: scopeEnum,
  scopeId: z.number().int().nullable(),
  kpiId: z.number().int(),
  targetValue: z.number().int().min(0),
});

export const targetsRouter = Router();
targetsRouter.use(authenticate);

// 一覧 (責任者・管理者が閲覧可)
targetsRouter.get(
  '/',
  authorize('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const filter: targets.TargetFilter = {};
    if (req.query.periodType) filter.periodType = req.query.periodType as any;
    if (req.query.scope) filter.scope = req.query.scope as any;
    res.json({ data: await targets.listTargets(filter) });
  }),
);

// 目標の設定 (管理者のみ)
targetsRouter.post(
  '/',
  authorize('admin'),
  asyncHandler(async (req, res) => res.status(201).json(await targets.upsertTarget(parse(upsertSchema, req.body)))),
);

targetsRouter.delete(
  '/:id',
  authorize('admin'),
  asyncHandler(async (req, res) => {
    await targets.deleteTarget(Number(req.params.id));
    res.status(204).end();
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { MASTER_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import * as rates from './rates.service.js';

const createSchema = z.object({
  name: z.string().min(1),
  numeratorKpiId: z.number().int(),
  denominatorKpiId: z.number().int(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const updateSchema = createSchema.partial();

export const ratesRouter = Router();
ratesRouter.use(authenticate);

ratesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive !== 'false';
    res.json({ data: await rates.listRateMetrics(includeInactive) });
  }),
);
ratesRouter.post(
  '/',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.status(201).json(await rates.createRateMetric(parse(createSchema, req.body)))),
);
ratesRouter.put(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.json(await rates.updateRateMetric(Number(req.params.id), parse(updateSchema, req.body)))),
);
ratesRouter.delete(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => {
    await rates.deleteRateMetric(Number(req.params.id));
    res.status(204).end();
  }),
);

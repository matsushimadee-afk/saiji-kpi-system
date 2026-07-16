import { Router } from 'express';
import { z } from 'zod';
import { MASTER_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import * as kpis from './kpis.service.js';

const createSchema = z.object({
  code: z.string().min(1).regex(/^[a-z0-9_]+$/i, '英数字とアンダースコアのみ使用できます'),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  color: z.string().nullable().optional(),
});
const updateSchema = createSchema.partial();

export const kpisRouter = Router();
kpisRouter.use(authenticate);

kpisRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive !== 'false';
    res.json({ data: await kpis.listKpis(includeInactive) });
  }),
);
kpisRouter.post(
  '/',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.status(201).json(await kpis.createKpi(parse(createSchema, req.body)))),
);
kpisRouter.put(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.json(await kpis.updateKpi(Number(req.params.id), parse(updateSchema, req.body)))),
);
kpisRouter.delete(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => {
    await kpis.deleteKpi(Number(req.params.id));
    res.status(204).end();
  }),
);

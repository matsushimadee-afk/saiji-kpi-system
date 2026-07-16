import { Router } from 'express';
import { z } from 'zod';
import { MASTER_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import * as venues from './venues.service.js';

const createSchema = z.object({
  name: z.string().min(1),
  area: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  displayOrder: z.number().int().optional(),
});
const updateSchema = createSchema.partial();

export const venuesRouter = Router();
venuesRouter.use(authenticate);

venuesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const onlyActive = req.query.onlyActive === 'true';
    res.json({ data: await venues.listVenues(onlyActive) });
  }),
);
venuesRouter.post(
  '/',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.status(201).json(await venues.createVenue(parse(createSchema, req.body)))),
);
venuesRouter.put(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.json(await venues.updateVenue(Number(req.params.id), parse(updateSchema, req.body)))),
);
venuesRouter.delete(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => {
    await venues.deleteVenue(Number(req.params.id));
    res.status(204).end();
  }),
);

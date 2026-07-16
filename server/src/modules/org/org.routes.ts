import { Router } from 'express';
import { z } from 'zod';
import { MASTER_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import * as org from './org.service.js';

const departmentCreate = z.object({
  name: z.string().min(1),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const departmentUpdate = departmentCreate.partial();

const teamCreate = z.object({
  name: z.string().min(1),
  departmentId: z.number().int().nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const teamUpdate = teamCreate.partial();

export const orgRouter = Router();
orgRouter.use(authenticate);

// ---- Departments ----
orgRouter.get(
  '/departments',
  asyncHandler(async (_req, res) => res.json({ data: await org.listDepartments() })),
);
orgRouter.post(
  '/departments',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.status(201).json(await org.createDepartment(parse(departmentCreate, req.body)))),
);
orgRouter.put(
  '/departments/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) =>
    res.json(await org.updateDepartment(Number(req.params.id), parse(departmentUpdate, req.body))),
  ),
);
orgRouter.delete(
  '/departments/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => {
    await org.deleteDepartment(Number(req.params.id));
    res.status(204).end();
  }),
);

// ---- Teams ----
orgRouter.get(
  '/teams',
  asyncHandler(async (_req, res) => res.json({ data: await org.listTeams() })),
);
orgRouter.post(
  '/teams',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.status(201).json(await org.createTeam(parse(teamCreate, req.body)))),
);
orgRouter.put(
  '/teams/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) =>
    res.json(await org.updateTeam(Number(req.params.id), parse(teamUpdate, req.body))),
  ),
);
orgRouter.delete(
  '/teams/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => {
    await org.deleteTeam(Number(req.params.id));
    res.status(204).end();
  }),
);

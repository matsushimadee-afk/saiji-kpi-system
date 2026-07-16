import { Router } from 'express';
import { z } from 'zod';
import { MASTER_ROLES } from '@saiji/shared';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parse } from '../../utils/validate.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { AppError } from '../../utils/AppError.js';
import * as users from './users.service.js';

const roleEnum = z.enum(['sales', 'leader', 'manager', 'admin']);
const statusEnum = z.enum(['active', 'inactive']);

const createSchema = z.object({
  employeeId: z.string().min(1),
  email: z.string().email().nullable().optional(),
  name: z.string().min(1),
  displayName: z.string().min(1),
  password: z.string().min(4),
  role: roleEnum,
  departmentId: z.number().int().nullable().optional(),
  teamId: z.number().int().nullable().optional(),
  managerId: z.number().int().nullable().optional(),
  title: z.string().nullable().optional(),
  status: statusEnum.optional(),
  displayOrder: z.number().int().optional(),
});

const updateSchema = z.object({
  email: z.string().email().nullable().optional(),
  name: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  password: z.string().min(4).optional(),
  role: roleEnum.optional(),
  departmentId: z.number().int().nullable().optional(),
  teamId: z.number().int().nullable().optional(),
  managerId: z.number().int().nullable().optional(),
  title: z.string().nullable().optional(),
  status: statusEnum.optional(),
  displayOrder: z.number().int().optional(),
});

export const usersRouter = Router();
usersRouter.use(authenticate);

// 一覧: 管理者は全件、責任者は自部署のみ
usersRouter.get(
  '/',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    const filter: users.UserFilter = {};
    // 責任者・リーダーは自部署のみ
    if (me.role === 'manager' || me.role === 'leader') {
      if (me.departmentId == null) return res.json({ data: [] });
      filter.departmentId = me.departmentId;
    } else if (req.query.departmentId) {
      filter.departmentId = Number(req.query.departmentId);
    }
    if (req.query.status) filter.status = req.query.status as any;
    res.json({ data: await users.listUsers(filter) });
  }),
);

usersRouter.get(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.json(await users.getUser(Number(req.params.id)))),
);

usersRouter.get(
  '/:id/history',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.json({ data: await users.getAssignmentHistory(Number(req.params.id)) })),
);

usersRouter.post(
  '/',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.status(201).json(await users.createUser(parse(createSchema, req.body)))),
);

usersRouter.put(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => res.json(await users.updateUser(Number(req.params.id), parse(updateSchema, req.body)))),
);

usersRouter.delete(
  '/:id',
  authorize(...MASTER_ROLES),
  asyncHandler(async (req, res) => {
    const me = requireUser(req);
    if (me.id === Number(req.params.id)) throw AppError.badRequest('自分自身は削除できません');
    await users.deleteUser(Number(req.params.id));
    res.status(204).end();
  }),
);

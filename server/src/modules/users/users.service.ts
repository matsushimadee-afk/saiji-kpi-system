import bcrypt from 'bcryptjs';
import type { Role, User, UserStatus } from '@saiji/shared';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { mapUser } from '../../utils/mappers.js';
import { insertId } from '../../utils/db.js';
import { todayDate } from '../../utils/datetime.js';

/** password_hash を除いた公開カラム + 表示用の結合名 */
const PUBLIC_COLUMNS = [
  'u.id',
  'u.employee_id',
  'u.email',
  'u.source',
  'u.name',
  'u.display_name',
  'u.department_id',
  'u.team_id',
  'u.title',
  'u.role',
  'u.manager_id',
  'u.status',
  'u.display_order',
  'u.created_at',
  'u.updated_at',
  'd.name as department_name',
  't.name as team_name',
  'm.display_name as manager_name',
];

function baseQuery() {
  return db()('users as u')
    .leftJoin('departments as d', 'u.department_id', 'd.id')
    .leftJoin('teams as t', 'u.team_id', 't.id')
    .leftJoin('users as m', 'u.manager_id', 'm.id')
    .select(PUBLIC_COLUMNS);
}

export interface UserFilter {
  departmentId?: number;
  status?: UserStatus;
  role?: Role;
}

export async function listUsers(filter: UserFilter = {}): Promise<User[]> {
  const q = baseQuery().orderBy('u.display_order').orderBy('u.id');
  if (filter.departmentId !== undefined) q.where('u.department_id', filter.departmentId);
  if (filter.status) q.where('u.status', filter.status);
  if (filter.role) q.where('u.role', filter.role);
  return (await q).map(mapUser);
}

export async function getUser(id: number): Promise<User> {
  const row = await baseQuery().where('u.id', id).first();
  if (!row) throw AppError.notFound('ユーザーが見つかりません');
  return mapUser(row);
}

export interface CreateUserInput {
  employeeId: string;
  email?: string | null;
  name: string;
  displayName: string;
  password: string;
  role: Role;
  departmentId?: number | null;
  teamId?: number | null;
  managerId?: number | null;
  title?: string | null;
  status?: UserStatus;
  displayOrder?: number;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const existing = await db()('users').where('employee_id', input.employeeId).first();
  if (existing) throw AppError.conflict(`社員ID "${input.employeeId}" は既に存在します`);

  const passwordHash = await bcrypt.hash(input.password, 10);
  const id = await insertId(
    db()('users').insert({
      employee_id: input.employeeId,
      email: input.email ?? null,
      name: input.name,
      display_name: input.displayName,
      password_hash: passwordHash,
      role: input.role,
      department_id: input.departmentId ?? null,
      team_id: input.teamId ?? null,
      manager_id: input.managerId ?? null,
      title: input.title ?? null,
      status: input.status ?? 'active',
      display_order: input.displayOrder ?? 0,
    }),
  );
  await recordAssignmentHistory(Number(id));
  return getUser(Number(id));
}

export interface UpdateUserInput {
  email?: string | null;
  name?: string;
  displayName?: string;
  password?: string;
  role?: Role;
  departmentId?: number | null;
  teamId?: number | null;
  managerId?: number | null;
  title?: string | null;
  status?: UserStatus;
  displayOrder?: number;
}

/** 所属関連フィールド (履歴記録の判定に利用) */
const ASSIGNMENT_FIELDS: (keyof UpdateUserInput)[] = [
  'departmentId',
  'teamId',
  'managerId',
  'title',
  'role',
];

export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  const current = await db()('users').where({ id }).first();
  if (!current) throw AppError.notFound('ユーザーが見つかりません');

  const patch: Record<string, unknown> = { updated_at: db().fn.now() };
  if (input.email !== undefined) patch.email = input.email;
  if (input.name !== undefined) patch.name = input.name;
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.role !== undefined) patch.role = input.role;
  if (input.departmentId !== undefined) patch.department_id = input.departmentId;
  if (input.teamId !== undefined) patch.team_id = input.teamId;
  if (input.managerId !== undefined) patch.manager_id = input.managerId;
  if (input.title !== undefined) patch.title = input.title;
  if (input.status !== undefined) patch.status = input.status;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  if (input.password) patch.password_hash = await bcrypt.hash(input.password, 10);

  await db()('users').where({ id }).update(patch);

  // 所属関連が変わったら履歴を記録 (異動の追跡)
  const assignmentChanged = ASSIGNMENT_FIELDS.some((f) => input[f] !== undefined);
  if (assignmentChanged) {
    await closeOpenHistory(id);
    await recordAssignmentHistory(id);
  }

  return getUser(id);
}

export async function deleteUser(id: number): Promise<void> {
  const affected = await db()('users').where({ id }).del();
  if (!affected) throw AppError.notFound('ユーザーが見つかりません');
}

// ---------------- 所属履歴 ----------------

async function closeOpenHistory(userId: number): Promise<void> {
  await db()('user_assignment_history')
    .where({ user_id: userId })
    .whereNull('effective_to')
    .update({ effective_to: todayDate() });
}

/** 現在の所属状態を履歴に 1 行追加する */
async function recordAssignmentHistory(userId: number): Promise<void> {
  const u = await db()('users').where({ id: userId }).first();
  if (!u) return;
  await db()('user_assignment_history').insert({
    user_id: userId,
    department_id: u.department_id,
    team_id: u.team_id,
    title: u.title,
    role: u.role,
    manager_id: u.manager_id,
    effective_from: todayDate(),
    effective_to: null,
  });
}

export async function getAssignmentHistory(userId: number) {
  return db()('user_assignment_history')
    .where({ user_id: userId })
    .orderBy('effective_from', 'desc')
    .orderBy('id', 'desc');
}

import type { Department, Team } from '@saiji/shared';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { mapDepartment, mapTeam } from '../../utils/mappers.js';
import { insertId } from '../../utils/db.js';

// ---------------- 部署 ----------------

export async function listDepartments(includeInactive = true): Promise<Department[]> {
  const q = db()('departments').orderBy('display_order').orderBy('id');
  if (!includeInactive) q.where('is_active', true);
  return (await q).map(mapDepartment);
}

export async function createDepartment(input: {
  name: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<Department> {
  const id = await insertId(
    db()('departments').insert({
      name: input.name,
      display_order: input.displayOrder ?? 0,
      is_active: input.isActive ?? true,
    }),
  );
  return getDepartment(Number(id));
}

export async function updateDepartment(
  id: number,
  input: Partial<{ name: string; displayOrder: number; isActive: boolean }>,
): Promise<Department> {
  const patch: Record<string, unknown> = { updated_at: db().fn.now() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  const affected = await db()('departments').where({ id }).update(patch);
  if (!affected) throw AppError.notFound('部署が見つかりません');
  return getDepartment(id);
}

export async function deleteDepartment(id: number): Promise<void> {
  const affected = await db()('departments').where({ id }).del();
  if (!affected) throw AppError.notFound('部署が見つかりません');
}

async function getDepartment(id: number): Promise<Department> {
  const row = await db()('departments').where({ id }).first();
  if (!row) throw AppError.notFound('部署が見つかりません');
  return mapDepartment(row);
}

// ---------------- チーム ----------------

export async function listTeams(includeInactive = true): Promise<Team[]> {
  const q = db()('teams').orderBy('display_order').orderBy('id');
  if (!includeInactive) q.where('is_active', true);
  return (await q).map(mapTeam);
}

export async function createTeam(input: {
  name: string;
  departmentId?: number | null;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<Team> {
  const id = await insertId(
    db()('teams').insert({
      name: input.name,
      department_id: input.departmentId ?? null,
      display_order: input.displayOrder ?? 0,
      is_active: input.isActive ?? true,
    }),
  );
  return getTeam(Number(id));
}

export async function updateTeam(
  id: number,
  input: Partial<{ name: string; departmentId: number | null; displayOrder: number; isActive: boolean }>,
): Promise<Team> {
  const patch: Record<string, unknown> = { updated_at: db().fn.now() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.departmentId !== undefined) patch.department_id = input.departmentId;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  const affected = await db()('teams').where({ id }).update(patch);
  if (!affected) throw AppError.notFound('チームが見つかりません');
  return getTeam(id);
}

export async function deleteTeam(id: number): Promise<void> {
  const affected = await db()('teams').where({ id }).del();
  if (!affected) throw AppError.notFound('チームが見つかりません');
}

async function getTeam(id: number): Promise<Team> {
  const row = await db()('teams').where({ id }).first();
  if (!row) throw AppError.notFound('チームが見つかりません');
  return mapTeam(row);
}

import type { Department, Kpi, RateMetric, Target, Team, User, Venue } from '@saiji/shared';

/** SQLite の 0/1 を boolean へ */
export function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1';
}

export function mapDepartment(r: any): Department {
  return {
    id: r.id,
    name: r.name,
    displayOrder: r.display_order,
    isActive: toBool(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapTeam(r: any): Team {
  return {
    id: r.id,
    departmentId: r.department_id ?? null,
    name: r.name,
    displayOrder: r.display_order,
    isActive: toBool(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapKpi(r: any): Kpi {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    displayOrder: r.display_order,
    isActive: toBool(r.is_active),
    color: r.color ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapRateMetric(r: any): RateMetric {
  return {
    id: r.id,
    name: r.name,
    numeratorKpiId: r.numerator_kpi_id,
    denominatorKpiId: r.denominator_kpi_id,
    displayOrder: r.display_order,
    isActive: toBool(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapVenue(r: any): Venue {
  return {
    id: r.id,
    name: r.name,
    area: r.area ?? null,
    status: r.status,
    displayOrder: r.display_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapUser(r: any): User {
  return {
    id: r.id,
    employeeId: r.employee_id,
    email: r.email ?? null,
    source: r.source ?? 'manual',
    name: r.name,
    displayName: r.display_name,
    departmentId: r.department_id ?? null,
    departmentName: r.department_name ?? null,
    teamId: r.team_id ?? null,
    teamName: r.team_name ?? null,
    title: r.title ?? null,
    role: r.role,
    managerId: r.manager_id ?? null,
    managerName: r.manager_name ?? null,
    status: r.status,
    displayOrder: r.display_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapTarget(r: any): Target {
  return {
    id: r.id,
    periodType: r.period_type,
    scope: r.scope,
    scopeId: r.scope_id ?? null,
    kpiId: r.kpi_id,
    targetValue: r.target_value,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

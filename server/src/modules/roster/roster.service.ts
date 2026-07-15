import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Role } from '@saiji/shared';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { insertId } from '../../utils/db.js';

/**
 * Googleシート「名簿」を正として営業担当マスタを同期する。
 * - 販路(channel) → 権限(role) をマッピング（催事=営業 / 責任者・閲覧のみ=責任者 / 開発者=管理者）
 * - Gmail をキーに UPSERT（Googleログインの突合キー）
 * - 退職=TRUE は無効化、名簿から消えた同期ユーザーも無効化（データは残す）
 */

interface ChannelMapping {
  role: Role;
  /** 催事部署に所属させるか（責任者スコープ用） */
  useCatsaiDept: boolean;
}

// 取込対象の販路と権限の対応（対象外の販路は取り込まない）
const CHANNEL_MAP: Record<string, ChannelMapping> = {
  催事: { role: 'sales', useCatsaiDept: true },
  '責任者・閲覧のみ': { role: 'manager', useCatsaiDept: true },
  開発者: { role: 'admin', useCatsaiDept: false },
};

const CATSAI_DEPT_NAME = '催事';

export interface RosterPerson {
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'inactive';
  action: 'created' | 'updated' | 'deactivated';
}

export interface RosterSyncResult {
  fetchedRows: number;
  created: number;
  updated: number;
  deactivated: number;
  people: RosterPerson[];
}

function csvUrl(): string {
  const base = `https://docs.google.com/spreadsheets/d/${env.roster.sheetId}/export?format=csv`;
  return env.roster.gid ? `${base}&gid=${env.roster.gid}` : base;
}

/** 簡易CSVパーサ（ダブルクォート対応） */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function ensureCatsaiDept(): Promise<number> {
  const existing = await db()('departments').where('name', CATSAI_DEPT_NAME).first();
  if (existing) return existing.id;
  const id = await insertId(db()('departments').insert({ name: CATSAI_DEPT_NAME, display_order: 99, is_active: true }));
  return Number(id);
}

async function resolveEmployeeId(base: string, email: string): Promise<string> {
  const taken = await db()('users').where('employee_id', base).andWhereNot('email', email).first();
  return taken ? email : base;
}

/** 名簿を取得して同期する */
export async function syncRoster(): Promise<RosterSyncResult> {
  let text: string;
  try {
    const res = await fetch(csvUrl());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (err) {
    throw new AppError(502, `名簿シートの取得に失敗しました: ${(err as Error).message}`, 'ROSTER_FETCH_FAILED');
  }

  const rows = parseCsv(text);
  if (rows.length < 2) throw AppError.badRequest('名簿シートにデータがありません');

  // 列位置をヘッダから解決（メンバー/販路/種別/Gmail/退職）
  const header = rows[0].map((h) => h.trim());
  const col = (name: string) => header.findIndex((h) => h === name);
  const iName = col('メンバー');
  const iChannel = col('販路');
  const iType = col('種別');
  const iEmail = col('Gmail');
  const iRetired = col('退職');
  if (iName < 0 || iChannel < 0 || iEmail < 0) {
    throw AppError.badRequest('名簿シートの列（メンバー/販路/Gmail）が見つかりません');
  }

  const catsaiDeptId = await ensureCatsaiDept();

  const result: RosterSyncResult = { fetchedRows: 0, created: 0, updated: 0, deactivated: 0, people: [] };
  const seenEmails = new Set<string>();
  const randomPasswordHash = await bcrypt.hash(randomUUID(), 10);

  for (const raw of rows.slice(1)) {
    const name = (raw[iName] ?? '').trim();
    const channel = (raw[iChannel] ?? '').trim();
    const email = (raw[iEmail] ?? '').trim().toLowerCase();
    const type = iType >= 0 ? (raw[iType] ?? '').trim() : '';
    const retired = iRetired >= 0 ? (raw[iRetired] ?? '').trim().toUpperCase() === 'TRUE' : false;

    if (!name || !email) continue; // 空行スキップ
    const mapping = CHANNEL_MAP[channel];
    if (!mapping) continue; // 取込対象外の販路

    result.fetchedRows++;
    seenEmails.add(email);

    const status: 'active' | 'inactive' = retired ? 'inactive' : 'active';
    const departmentId = mapping.useCatsaiDept ? catsaiDeptId : null;

    const existing = await db()('users').where('email', email).first();
    const common = {
      name,
      display_name: name,
      role: mapping.role,
      title: type || null,
      department_id: departmentId,
      status,
      source: 'roster',
      updated_at: db().fn.now(),
    };

    if (existing) {
      await db()('users').where({ id: existing.id }).update(common);
      result.updated++;
      result.people.push({ email, name, role: mapping.role, status, action: 'updated' });
    } else {
      const base = email.split('@')[0];
      const employeeId = await resolveEmployeeId(base, email);
      await db()('users').insert({
        employee_id: employeeId,
        email,
        password_hash: randomPasswordHash, // Googleログインのため未使用
        display_order: 0,
        ...common,
      });
      result.created++;
      result.people.push({ email, name, role: mapping.role, status, action: 'created' });
    }
  }

  // 催事の営業担当に「責任者」を紐付け（催事部署の manager を担当上長に）
  const catsaiManager = await db()('users')
    .where({ department_id: catsaiDeptId, role: 'manager', status: 'active' })
    .first();
  if (catsaiManager) {
    await db()('users')
      .where({ department_id: catsaiDeptId, role: 'sales', source: 'roster' })
      .update({ manager_id: catsaiManager.id });
  }

  // 名簿から消えた同期ユーザーを無効化（削除はしない）
  const rosterUsers = await db()('users').where('source', 'roster');
  for (const u of rosterUsers) {
    if (u.email && !seenEmails.has(u.email) && u.status !== 'inactive') {
      await db()('users').where({ id: u.id }).update({ status: 'inactive', updated_at: db().fn.now() });
      result.deactivated++;
      result.people.push({ email: u.email, name: u.name, role: u.role, status: 'inactive', action: 'deactivated' });
    }
  }

  return result;
}

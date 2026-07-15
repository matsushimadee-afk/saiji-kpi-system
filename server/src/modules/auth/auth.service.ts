import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import type { AuthUser } from '@saiji/shared';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const googleClient = new OAuth2Client();

/** ユーザー行 → AuthUser（表示用の部署名を含む） */
function toAuthUser(row: any): AuthUser {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    displayName: row.display_name,
    role: row.role,
    departmentId: row.department_id ?? null,
    departmentName: row.department_name ?? null,
    teamId: row.team_id ?? null,
  };
}

function baseUserQuery() {
  return db()('users as u')
    .leftJoin('departments as d', 'u.department_id', 'd.id')
    .select(
      'u.id',
      'u.employee_id',
      'u.name',
      'u.display_name',
      'u.role',
      'u.status',
      'u.password_hash',
      'u.department_id',
      'u.team_id',
      'u.email',
      'd.name as department_name',
    );
}

/** 社員ID + パスワードで認証（管理者の緊急用ログイン） */
export async function login(employeeId: string, password: string): Promise<AuthUser> {
  const row = await baseUserQuery().where('u.employee_id', employeeId).first();
  if (!row) throw AppError.unauthorized('社員IDまたはパスワードが違います');
  if (row.status !== 'active') throw AppError.forbidden('このアカウントは無効です');

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw AppError.unauthorized('社員IDまたはパスワードが違います');
  return toAuthUser(row);
}

/** Google IDトークンで認証。名簿(email)に在籍で存在する場合のみ許可。 */
export async function loginWithGoogle(credential: string): Promise<AuthUser> {
  if (!env.googleClientId) {
    throw new AppError(501, 'Googleログインが未設定です（GOOGLE_CLIENT_ID）', 'GOOGLE_NOT_CONFIGURED');
  }

  let email: string | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    email = ticket.getPayload()?.email?.toLowerCase();
  } catch {
    throw AppError.unauthorized('Google認証に失敗しました');
  }
  if (!email) throw AppError.unauthorized('メールアドレスを取得できませんでした');

  const row = await baseUserQuery().where('u.email', email).first();
  if (!row) throw AppError.forbidden('このGoogleアカウントは名簿に登録されていません');
  if (row.status !== 'active') throw AppError.forbidden('このアカウントは無効です（退職・停止）');
  return toAuthUser(row);
}

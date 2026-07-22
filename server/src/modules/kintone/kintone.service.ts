import type { AuthUser, DailyReportResult } from '@saiji/shared';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

/**
 * キントーン日報連携。
 * カウンターの当日数値をキントーンの日報アプリにレコードとして追加し、
 * 編集画面URLを返す（本人がそこで気付きを記入）。
 */

/** KPIコード → キントーンのフィールド名（ラベル）。カウンターと表記が違う項目を吸収 */
const KPI_TO_KINTONE_LABEL: Record<string, string> = {
  catch: 'キャッチ数',
  power_hearing: '電力会社ヒアリング数',
  lottery: '抽選件数',
  survey: 'アンケート数',
  negotiation: '商談数(着席)',
  talk: '商談数(着席なし)',
  company_intro: '会社案内アウト',
  order: '受注数',
};

const BASE = () => `https://${env.kintone.subdomain}.cybozu.com`;

export function isEnabled(): boolean {
  return Boolean(env.kintone.apiToken && env.kintone.subdomain && env.kintone.appId);
}

/** ラベルの表記ゆれ（全角半角・空白）を吸収 */
function norm(s: string): string {
  return s.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

interface FieldMeta {
  code: string;
  label: string;
  type: string;
}

let fieldCache: Map<string, FieldMeta> | null = null;

/** フォームのフィールド定義を取得（ラベル正規化→メタ のマップ）。プロセス内キャッシュ。 */
async function getLabelIndex(force = false): Promise<Map<string, FieldMeta>> {
  if (fieldCache && !force) return fieldCache;
  const url = `${BASE()}/k/v1/app/form/fields.json?app=${env.kintone.appId}`;
  const res = await fetch(url, { headers: { 'X-Cybozu-API-Token': env.kintone.apiToken } });
  if (!res.ok) {
    throw new AppError(502, `キントーンのフィールド取得に失敗しました (${res.status})`, 'KINTONE_FIELDS_FAILED');
  }
  const data = (await res.json()) as { properties: Record<string, FieldMeta> };
  const idx = new Map<string, FieldMeta>();
  for (const code of Object.keys(data.properties)) {
    const f = data.properties[code];
    idx.set(norm(f.label), { code: f.code, label: f.label, type: f.type });
  }
  fieldCache = idx;
  return idx;
}

/** ローカル確認用: 全フィールドの (label, code, type) を返す */
export async function discoverFields(): Promise<FieldMeta[]> {
  const idx = await getLabelIndex(true);
  return [...idx.values()];
}

/** 当日の日報をキントーンに登録し、編集画面URLを返す */
export async function submitDailyReport(user: AuthUser, date: string): Promise<DailyReportResult> {
  if (!isEnabled()) {
    throw new AppError(501, 'キントーン連携が未設定です', 'KINTONE_NOT_CONFIGURED');
  }

  const me = await db()('users').where({ id: user.id }).first();
  if (!me?.kintone_user) {
    throw AppError.badRequest('あなたのキントーンユーザーが未設定です。管理者に設定を依頼してください。');
  }

  // 当日の自分のKPI件数
  const kpis = await db()('kpis').where('is_active', true);
  const countRows = await db()('kpi_entries')
    .where({ user_id: user.id, entry_date: date, is_active: true })
    .groupBy('kpi_id')
    .select('kpi_id')
    .sum({ total: 'amount' });
  const countByKpiId = new Map<number, number>(countRows.map((r: any) => [r.kpi_id, Number(r.total)]));

  // 当日の会場（最新入力の会場）
  const last = await db()('kpi_entries')
    .where({ user_id: user.id, entry_date: date, is_active: true })
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .first();
  let venueName: string | null = null;
  if (last?.venue_id) {
    const v = await db()('venues').where({ id: last.venue_id }).first();
    venueName = v?.name ?? null;
  }

  const idx = await getLabelIndex();
  const field = (label: string) => idx.get(norm(label));
  const record: Record<string, { value: unknown }> = {};

  // KPI件数
  for (const k of kpis) {
    const label = KPI_TO_KINTONE_LABEL[k.code];
    if (!label) continue;
    const f = field(label);
    if (f) record[f.code] = { value: String(countByKpiId.get(k.id) ?? 0) };
  }
  // 日付 / 販路(=催事) / 名前 / 催事施設
  const dateF = field('日付');
  if (dateF) record[dateF.code] = { value: date };
  const channelF = field('販路');
  if (channelF) record[channelF.code] = { value: '催事' };
  const nameF = field('名前');
  if (nameF) record[nameF.code] = { value: [{ code: me.kintone_user }] };
  const venueF = field('催事施設');
  if (venueF && venueName) record[venueF.code] = { value: venueName };

  const res = await fetch(`${BASE()}/k/v1/record.json`, {
    method: 'POST',
    headers: { 'X-Cybozu-API-Token': env.kintone.apiToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ app: Number(env.kintone.appId), record }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new AppError(502, `キントーンへの登録に失敗しました: ${text.slice(0, 300)}`, 'KINTONE_CREATE_FAILED');
  }
  const data = (await res.json()) as { id: string };
  const recordId = String(data.id);
  const editUrl = `${BASE()}/k/${env.kintone.appId}/show#record=${recordId}&mode=edit`;
  return { recordId, editUrl };
}

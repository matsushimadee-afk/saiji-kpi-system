import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

/**
 * 初期データ（本番構成のベース）。
 * - KPI（カウンター項目）7種 と 転換率（数値項目）6種 を投入
 * - 部署「催事」と 緊急用の管理者アカウントのみ
 * - 実際の営業担当は Googleシート名簿から `npm run sync:roster` で取り込む
 *
 * 緊急用ログイン: admin / admin1234
 *
 * ※ 明示的な id は使わない（PostgreSQL のシーケンスと整合させるため）。
 *   外部キーは自然キー(code 等)で解決する。
 */
export async function seed(knex: Knex): Promise<void> {
  await knex('kpi_entries').del();
  await knex('targets').del();
  await knex('rate_metrics').del();
  await knex('user_assignment_history').del();
  await knex('users').del();
  await knex('venues').del();
  await knex('kpis').del();
  await knex('teams').del();
  await knex('departments').del();

  // --- 部署 ---
  await knex('departments').insert([{ name: '催事', display_order: 1, is_active: true }]);

  // --- KPIマスタ（カウンター項目）---
  await knex('kpis').insert([
    { code: 'catch', name: 'キャッチ数', description: 'お客様に声をかけたとき', display_order: 1, is_active: true, color: '#3B82F6' },
    { code: 'power_hearing', name: '電力会社ヒアリング数(シール)', description: '電力会社を聞けた／シールを貼れたとき', display_order: 2, is_active: true, color: '#06B6D4' },
    { code: 'lottery', name: '抽選数', description: '抽選をしてもらえたとき', display_order: 3, is_active: true, color: '#8B5CF6' },
    { code: 'survey', name: 'アンケート数', description: 'アンケートを書いてもらえたとき', display_order: 4, is_active: true, color: '#EC4899' },
    { code: 'negotiation', name: '商談数(着座)', description: '座って商談ができたとき', display_order: 5, is_active: true, color: '#F59E0B' },
    { code: 'company_intro', name: '会社案内アウト', description: '会社案内を突破できたとき', display_order: 6, is_active: true, color: '#F97316' },
    { code: 'order', name: '受注数', description: '受注できたとき', display_order: 7, is_active: true, color: '#10B981' },
  ]);

  // KPI の id を code から引くマップ
  const kpiRows = await knex('kpis').select('id', 'code');
  const kpiId = (code: string): number => {
    const row = kpiRows.find((k: any) => k.code === code);
    if (!row) throw new Error(`kpi code ${code} not found`);
    return row.id;
  };

  // --- 転換率マスタ（数値項目）= 分子KPI ÷ 分母KPI ---
  await knex('rate_metrics').insert([
    { name: '電力会社ヒアリング率', numerator_kpi_id: kpiId('power_hearing'), denominator_kpi_id: kpiId('catch'), display_order: 1, is_active: true },
    { name: '抽選率', numerator_kpi_id: kpiId('lottery'), denominator_kpi_id: kpiId('power_hearing'), display_order: 2, is_active: true },
    { name: 'アンケート率', numerator_kpi_id: kpiId('survey'), denominator_kpi_id: kpiId('lottery'), display_order: 3, is_active: true },
    { name: '商談率', numerator_kpi_id: kpiId('negotiation'), denominator_kpi_id: kpiId('survey'), display_order: 4, is_active: true },
    { name: '会社案内アウト率', numerator_kpi_id: kpiId('company_intro'), denominator_kpi_id: kpiId('negotiation'), display_order: 5, is_active: true },
    { name: '受注率', numerator_kpi_id: kpiId('order'), denominator_kpi_id: kpiId('negotiation'), display_order: 6, is_active: true },
  ]);

  // --- 会場マスタ（サンプル。会場マスタから編集可）---
  await knex('venues').insert([
    { name: '会場A', area: null, status: 'active', display_order: 1 },
    { name: '会場B', area: null, status: 'active', display_order: 2 },
    { name: '会場C', area: null, status: 'active', display_order: 3 },
  ]);

  // --- 緊急用 管理者 ---
  const adminHash = bcrypt.hashSync('admin1234', 10);
  await knex('users').insert([
    {
      employee_id: 'admin',
      email: null,
      name: '管理者',
      display_name: '管理者',
      department_id: null,
      team_id: null,
      title: 'システム管理者',
      role: 'admin',
      manager_id: null,
      status: 'active',
      display_order: 0,
      password_hash: adminHash,
      source: 'manual',
    },
  ]);
}

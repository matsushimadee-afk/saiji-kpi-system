import { Knex } from 'knex';

/**
 * KPI に「説明（押すタイミング）」を追加。
 * アプリ内の使い方ガイドに表示し、マスタ画面から現場の言葉に編集できるようにする。
 */
const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  catch: 'お客様に声をかけたとき',
  power_hearing: '電力会社を聞けた／シールを貼れたとき',
  lottery: '抽選をしてもらえたとき',
  survey: 'アンケートを書いてもらえたとき',
  negotiation: '座って商談ができたとき',
  company_intro: '会社案内を突破できたとき',
  order: '受注できたとき',
};

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('kpis', (t) => {
    t.string('description').nullable();
  });
  // 既存KPIに初期値を投入（マスタ画面からいつでも編集可）
  for (const [code, description] of Object.entries(DEFAULT_DESCRIPTIONS)) {
    await knex('kpis').where({ code }).update({ description });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('kpis', (t) => {
    t.dropColumn('description');
  });
}

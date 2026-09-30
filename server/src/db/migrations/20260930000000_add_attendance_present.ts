import { Knex } from 'knex';

/**
 * 出席テーブルに present（いた/いない）フラグを追加。
 * present=true  … その会場にいた（KPI入力が無くても場所代の対象に含める）
 * present=false … その会場にいない（KPI入力があっても場所代の対象から外す＝会場ミスの除外）
 * レコードが無い担当者は従来どおり「KPI入力があれば対象」。
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('venue_attendance', (t) => {
    t.boolean('present').notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('venue_attendance', (t) => {
    t.dropColumn('present');
  });
}

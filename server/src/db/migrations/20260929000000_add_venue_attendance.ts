import { Knex } from 'knex';

/**
 * 出席テーブル（場所代の頭割り対象）。
 * 「その日・その会場に誰がいたか」を KPI 入力とは別に記録できるようにする。
 * KPI 入力を忘れた担当者を責任者・リーダーが後から追加でき、場所代の頭割りを正しくする。
 * 場所代の集計では kpi_entries の入力者と、この出席レコードを合わせて（重複除外して）人数を数える。
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('venue_attendance', (t) => {
    t.increments('id').primary();
    t.date('entry_date').notNullable();
    t.integer('venue_id').notNullable().references('id').inTable('venues').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.unique(['entry_date', 'venue_id', 'user_id']);
    t.index(['entry_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('venue_attendance');
}

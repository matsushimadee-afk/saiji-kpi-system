import { Knex } from 'knex';

/**
 * 本日の会場（日次設定）。
 * リーダー・責任者・管理者が「その日の会場」と「場所代」を設定し、
 * メンバーはその中から自分の会場を選んでカウントする。
 * 同じ日に複数会場（チームが分かれる日）に対応するため (date, venue) 単位。
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('daily_venues', (t) => {
    t.increments('id').primary();
    t.date('entry_date').notNullable();
    t.integer('venue_id').notNullable().references('id').inTable('venues').onDelete('CASCADE');
    t.integer('cost').nullable(); // 場所代（円）
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.unique(['entry_date', 'venue_id']);
    t.index(['entry_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('daily_venues');
}

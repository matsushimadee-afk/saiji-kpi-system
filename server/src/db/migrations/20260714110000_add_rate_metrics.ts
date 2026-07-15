import { Knex } from 'knex';

/**
 * 転換率マスタ（数値項目）。
 * 分子KPI ÷ 分母KPI で率を自動計算する。KPIと同様、追加・変更は画面から可能。
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rate_metrics', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.integer('numerator_kpi_id').notNullable().references('id').inTable('kpis').onDelete('CASCADE');
    t.integer('denominator_kpi_id').notNullable().references('id').inTable('kpis').onDelete('CASCADE');
    t.integer('display_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rate_metrics');
}

import { Knex } from 'knex';

/**
 * 会場マスタに「基本の場所代（円）」を追加。
 * 本日の会場を設定するときの初期値として使う（当日だけ違う金額に上書きも可）。
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('venues', (t) => {
    t.integer('cost').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('venues', (t) => {
    t.dropColumn('cost');
  });
}

import { Knex } from 'knex';

/**
 * Googleログイン対応 & 名簿(Googleシート)同期のためのカラム追加。
 * - email: Googleアカウント(Gmail)。ログイン時の突合キー。
 * - source: 'manual'（手動作成）/ 'roster'（シート同期由来）。同期時の対象判定に使う。
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.string('email').nullable();
    t.string('source').notNullable().defaultTo('manual');
  });
  // Gmail の重複を防ぐユニークインデックス（NULL は重複可）
  await knex.schema.alterTable('users', (t) => {
    t.unique(['email']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropUnique(['email']);
  });
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('email');
    t.dropColumn('source');
  });
}

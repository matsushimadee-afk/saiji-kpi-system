import { Knex } from 'knex';

/**
 * 日報連携用: ユーザーにキントーンのログイン名(ユーザーコード)を保持する。
 * 日報レコードの「名前」(USER_SELECT) に設定するために使う。
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.string('kintone_user').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('kintone_user');
  });
}

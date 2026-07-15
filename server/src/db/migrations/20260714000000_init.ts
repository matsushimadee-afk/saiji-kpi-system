import { Knex } from 'knex';

/**
 * 初期スキーマ。
 * マスタ中心設計: KPI / 会場 / 部署 / チーム / 目標 をすべてテーブル化し、
 * 追加・変更をコード修正なしで行えるようにする。
 * 入力データ (kpi_entries) には所属を「スナップショット」として持たせ、
 * 異動後も過去の集計が変化しないようにする。
 */
export async function up(knex: Knex): Promise<void> {
  // 部署
  await knex.schema.createTable('departments', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.integer('display_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // チーム
  await knex.schema.createTable('teams', (t) => {
    t.increments('id').primary();
    t.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
    t.string('name').notNullable();
    t.integer('display_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // KPI マスタ
  await knex.schema.createTable('kpis', (t) => {
    t.increments('id').primary();
    t.string('code').notNullable().unique(); // 例: call / seat / negotiation / contract
    t.string('name').notNullable();
    t.integer('display_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.string('color').nullable();
    t.timestamps(true, true);
  });

  // 会場マスタ
  await knex.schema.createTable('venues', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('area').nullable();
    t.string('status').notNullable().defaultTo('active'); // active / inactive
    t.integer('display_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  // ユーザー (営業担当 / 責任者 / 管理者)
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('employee_id').notNullable().unique();
    t.string('name').notNullable();
    t.string('display_name').notNullable();
    t.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
    t.integer('team_id').references('id').inTable('teams').onDelete('SET NULL');
    t.string('title').nullable(); // 役職 (自由記述)
    t.string('role').notNullable().defaultTo('sales'); // sales / manager / admin
    t.integer('manager_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('status').notNullable().defaultTo('active'); // active / inactive
    t.integer('display_order').notNullable().defaultTo(0);
    t.string('password_hash').notNullable();
    t.timestamps(true, true);
  });

  // 所属履歴 (将来の異動追跡用)。現状は参照用の受け皿として用意。
  await knex.schema.createTable('user_assignment_history', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
    t.integer('team_id').references('id').inTable('teams').onDelete('SET NULL');
    t.string('title').nullable();
    t.string('role').notNullable();
    t.integer('manager_id').references('id').inTable('users').onDelete('SET NULL');
    t.date('effective_from').notNullable();
    t.date('effective_to').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 目標マスタ (日次/月次 × スコープ × KPI)
  await knex.schema.createTable('targets', (t) => {
    t.increments('id').primary();
    t.string('period_type').notNullable(); // daily / monthly
    t.string('scope').notNullable(); // overall / department / team / user / venue
    t.integer('scope_id').nullable(); // overall の場合は null
    t.integer('kpi_id').notNullable().references('id').inTable('kpis').onDelete('CASCADE');
    t.integer('target_value').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['period_type', 'scope', 'scope_id', 'kpi_id']);
  });

  // KPI 入力データ (1 タップ = 1 レコード, Undo は is_active=false)
  await knex.schema.createTable('kpi_entries', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('kpi_id').notNullable().references('id').inTable('kpis').onDelete('CASCADE');
    t.integer('venue_id').references('id').inTable('venues').onDelete('SET NULL');
    t.integer('department_id').nullable(); // 入力時点の所属スナップショット
    t.integer('team_id').nullable();
    t.integer('amount').notNullable().defaultTo(1);
    t.date('entry_date').notNullable(); // 業務日 YYYY-MM-DD
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['entry_date', 'is_active']);
    t.index(['user_id', 'entry_date']);
    t.index(['kpi_id', 'entry_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('kpi_entries');
  await knex.schema.dropTableIfExists('targets');
  await knex.schema.dropTableIfExists('user_assignment_history');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('venues');
  await knex.schema.dropTableIfExists('kpis');
  await knex.schema.dropTableIfExists('teams');
  await knex.schema.dropTableIfExists('departments');
}

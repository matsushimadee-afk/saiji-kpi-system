import type { Knex } from 'knex';

/**
 * INSERT した行の id を DB 非依存で取得する。
 * PostgreSQL は RETURNING が必須、SQLite(better-sqlite3) は lastInsertRowid を返す。
 * 両者の戻り値の差（{id} オブジェクト or 数値）を吸収する。
 */
export async function insertId(builder: Knex.QueryBuilder): Promise<number> {
  const [row] = await builder.returning('id');
  if (row !== null && typeof row === 'object') {
    return (row as { id: number }).id;
  }
  return row as number;
}

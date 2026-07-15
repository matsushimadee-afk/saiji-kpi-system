import fs from 'node:fs';
import path from 'node:path';
import knex, { Knex } from 'knex';
import { env } from './env.js';

/**
 * Knex 設定。
 * 開発は SQLite (better-sqlite3)、本番は PostgreSQL に切り替えられるよう
 * クライアントを環境変数で分岐する。マイグレーション/シードは共通のため、
 * DB エンジンの差し替えでアプリコードを変更する必要はほぼない。
 */
function buildConfig(): Knex.Config {
  const migrations: Knex.MigratorConfig = {
    directory: path.resolve(process.cwd(), 'src/db/migrations'),
    loadExtensions: ['.ts', '.js'],
    extension: 'ts',
  };
  const seeds: Knex.SeederConfig = {
    directory: path.resolve(process.cwd(), 'src/db/seeds'),
    loadExtensions: ['.ts', '.js'],
    extension: 'ts',
  };

  if (env.db.client === 'pg') {
    // Neon 等のマネージドPostgresはSSL必須。DB_SSL=false で無効化可能。
    const ssl = process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false };
    return {
      client: 'pg',
      connection: { connectionString: env.db.url, ssl },
      pool: { min: 0, max: 10 },
      migrations,
      seeds,
    };
  }

  // SQLite
  const filename = path.resolve(process.cwd(), env.db.file);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  return {
    client: 'better-sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    // SQLite で外部キー制約を有効化
    pool: {
      afterCreate: (conn: any, done: (err: Error | null, conn: any) => void) => {
        conn.pragma('foreign_keys = ON');
        done(null, conn);
      },
    },
    migrations,
    seeds,
  };
}

export const knexConfig = buildConfig();

let instance: Knex | null = null;

/** アプリ全体で共有する Knex インスタンス */
export function db(): Knex {
  if (!instance) {
    instance = knex(knexConfig);
  }
  return instance;
}

export async function closeDb(): Promise<void> {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}

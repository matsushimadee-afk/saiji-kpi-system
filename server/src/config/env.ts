import 'dotenv/config';

/**
 * 環境変数を一箇所で解決・検証する。
 * ここを通してのみ環境変数へアクセスすることで設定漏れを早期に検知する。
 */

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`環境変数 ${key} が設定されていません`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET', 'dev-secret-please-change'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  // 未設定なら「全オリジン許可」(単一サービス同一オリジン配信のため)。
  // 本番でドメインが確定したら CLIENT_ORIGIN に設定して絞り込める。
  clientOrigins: (process.env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  db: {
    client: process.env.DB_CLIENT ?? 'better-sqlite3',
    file: process.env.DB_FILE ?? './data/kpi.sqlite',
    url: process.env.DATABASE_URL,
  },
  // 本番でビルド済みフロントを配信する際のパス（server の cwd からの相対）
  clientDist: process.env.CLIENT_DIST ?? '../client/dist',
  // Google ログイン (OAuth クライアントID)。未設定なら Google ログインは無効。
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  // 名簿(Googleシート)。CSV公開エクスポートで読み込む。
  roster: {
    sheetId: process.env.ROSTER_SHEET_ID ?? '1ya61d3P2cWppsnrXnQCLMNAeOrobtqitRze-Q5chgHA',
    gid: process.env.ROSTER_SHEET_GID ?? '', // 特定タブを指定する場合
  },
  isProduction: process.env.NODE_ENV === 'production',
} as const;

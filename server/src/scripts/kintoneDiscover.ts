import { env } from '../config/env.js';
import { discoverFields } from '../modules/kintone/kintone.service.js';

/**
 * キントーンのフィールド(ラベル・コード・型)を一覧表示する。
 * トークンを server/.env に設定してから実行し、マッピングを確認する。
 *   npm run kintone:discover
 */
async function main() {
  if (!env.kintone.apiToken) {
    console.log('KINTONE_API_TOKEN が未設定です。server/.env に設定してください。');
    return;
  }
  console.log(`アプリ: ${env.kintone.subdomain}.cybozu.com / appId=${env.kintone.appId}`);
  const fields = await discoverFields();
  console.log(`フィールド ${fields.length}件:`);
  for (const f of fields) {
    console.log(`  [${f.type}] ${f.label}  →  code: ${f.code}`);
  }
}

main().catch((err) => {
  console.error('エラー:', err?.message ?? err);
  process.exit(1);
});

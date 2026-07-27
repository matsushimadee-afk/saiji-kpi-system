import { env } from '../config/env.js';

/**
 * 各メンバーの kintone_user 名が、キントーンの「名前」(USER_SELECT) として有効かを
 * 読み取り専用で確認する。レコードは作成しない。
 *   npx tsx src/scripts/kintoneUserCheck.ts
 */
const NAMES = ['松嶋和花', '豊田匠', '田中友規', '中原樹里奈', '松勢海努', '森野茜', '村上紗香'];

const BASE = `https://${env.kintone.subdomain}.cybozu.com`;

async function main() {
  const H = { 'X-Cybozu-API-Token': env.kintone.apiToken };
  console.log('■ 「名前 in (…)」クエリでUSER_SELECTコードの妥当性を確認\n');
  for (const name of NAMES) {
    const q = encodeURIComponent(`名前 in ("${name}") limit 1`);
    const res = await fetch(`${BASE}/k/v1/records.json?app=${env.kintone.appId}&query=${q}`, { headers: H });
    if (res.ok) {
      const d = (await res.json()) as { records: unknown[] };
      console.log(`  ○ ${name} : 有効（該当 ${d.records.length} 件）`);
    } else {
      const t = await res.text();
      console.log(`  × ${name} : エラー ${res.status} ${t.slice(0, 160)}`);
    }
  }
}

main().catch((e) => {
  console.error('エラー:', e?.message ?? e);
  process.exit(1);
});

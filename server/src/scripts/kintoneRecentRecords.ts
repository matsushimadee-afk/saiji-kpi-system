import { env } from '../config/env.js';

/**
 * 直近の日報レコードを読み取り専用で確認する。
 * 「メンバーの提出でレコードが作られているか（＝作成は成功か）」を切り分ける。
 *   npx tsx src/scripts/kintoneRecentRecords.ts
 */
const BASE = `https://${env.kintone.subdomain}.cybozu.com`;

async function main() {
  const H = { 'X-Cybozu-API-Token': env.kintone.apiToken };
  const q = encodeURIComponent('order by レコード番号 desc limit 20');
  const res = await fetch(`${BASE}/k/v1/records.json?app=${env.kintone.appId}&query=${q}`, { headers: H });
  const data = (await res.json()) as { records: Record<string, { value: unknown }>[] };
  const v = (r: Record<string, { value: unknown }>, k: string) => {
    const val = r[k]?.value;
    if (Array.isArray(val)) return val.map((x: { name?: string }) => x.name).join(',');
    if (val && typeof val === 'object') {
      const o = val as { name?: string; code?: string };
      return `${o.name ?? ''}(${o.code ?? ''})`;
    }
    return String(val ?? '');
  };
  console.log('レコード# | 作成者(名前/ログイン名) | 名前欄 | 日付 | 催事施設 | キャッチ');
  for (const r of data.records) {
    console.log(
      [
        v(r, 'レコード番号'),
        v(r, '作成者'),
        v(r, '名前'),
        v(r, '日付'),
        v(r, '催事施設') || '(空)',
        v(r, 'キャッチ数'),
      ].join(' | '),
    );
  }
}

main().catch((e) => {
  console.error('エラー:', e?.message ?? e);
  process.exit(1);
});

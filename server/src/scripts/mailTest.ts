import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { isMailEnabled, notifyDailyReport } from '../modules/notify/dailyReportMail.js';

/**
 * 日報提出メールの疎通確認。
 *   npx tsx src/scripts/mailTest.ts
 * MAIL_USER / MAIL_APP_PASSWORD を .env に設定してから実行する。
 * 実際に「責任者・リーダー」宛てにサンプル通知が飛ぶので注意。
 */
async function main() {
  if (!isMailEnabled()) {
    console.log('メール未設定です。.env に MAIL_USER と MAIL_APP_PASSWORD を設定してください。');
    return;
  }
  console.log(`送信元: ${env.mail.user} / ${env.mail.host}:${env.mail.port}`);

  const recips = await db()('users')
    .whereIn('role', ['manager', 'leader'])
    .where('status', 'active')
    .whereNotNull('email')
    .select('display_name', 'email', 'role');
  console.log(`宛先(責任者・リーダー) ${recips.length}名:`);
  for (const r of recips) console.log(`  - ${r.display_name} <${r.email}> [${r.role}]`);
  if (env.mail.extraTo.length) console.log('固定追加宛先:', env.mail.extraTo.join(', '));

  await notifyDailyReport({
    submitterName: 'テスト太郎',
    submitterEmail: null,
    date: '2026-07-27',
    venueName: 'テスト会場（イオンモール）',
    lines: [
      { name: 'キャッチ数', count: 79 },
      { name: '電力会社ヒアリング数(シール)', count: 43 },
      { name: '抽選数', count: 28 },
      { name: 'アンケート数', count: 19 },
      { name: '商談数(着座)', count: 9 },
      { name: '会社案内アウト', count: 6 },
      { name: '受注数', count: 2 },
    ],
    editUrl: `https://${env.kintone.subdomain}.cybozu.com/k/${env.kintone.appId}/`,
  });

  console.log('送信処理を実行しました。受信ボックスを確認してください。');
  await db().destroy();
}

main().catch(async (err) => {
  console.error('エラー:', err?.message ?? err);
  process.exit(1);
});

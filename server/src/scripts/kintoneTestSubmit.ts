import { db } from '../config/database.js';
import { submitDailyReport } from '../modules/kintone/kintone.service.js';

/**
 * 疎通確認用: 指定ユーザー・指定日の日報をキントーンに1件登録する。
 *   npx tsx src/scripts/kintoneTestSubmit.ts 森野茜 2026-07-22
 * 本番アプリにレコードが増えるので、確認後は手動で削除すること。
 */
async function main() {
  const name = process.argv[2];
  const date = process.argv[3];
  const me = await db()('users').where({ name }).first();
  if (!me) throw new Error(`ユーザー ${name} が見つかりません`);

  const result = await submitDailyReport(
    { id: me.id, name: me.name, role: me.role, departmentId: me.department_id } as any,
    date,
  );
  console.log('登録OK: recordId =', result.recordId);
  console.log('編集URL:', result.editUrl);
  await db().destroy();
}

main().catch(async (err) => {
  console.error('エラー:', err?.message ?? err);
  process.exit(1);
});

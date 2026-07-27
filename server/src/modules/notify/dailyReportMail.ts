import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';

/**
 * 日報提出をメールで通知する。
 * 宛先＝権限が「責任者(manager)・リーダー(leader)」の在籍ユーザー（メールあり）＋ MAIL_EXTRA_TO。
 * 送信に失敗しても日報提出自体は成功扱いにするため、呼び出し側は結果を待たず握りつぶす。
 */

export interface DailyReportMailInput {
  submitterName: string;
  submitterEmail: string | null;
  date: string;
  venueName: string | null;
  /** KPI名と件数（表示順） */
  lines: { name: string; count: number }[];
  editUrl: string;
}

let transporter: Transporter | null = null;

export function isMailEnabled(): boolean {
  return Boolean(env.mail.user && env.mail.appPassword);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465, // 465=SSL / 587=STARTTLS
      auth: { user: env.mail.user, pass: env.mail.appPassword },
    });
  }
  return transporter;
}

/** 通知先メールアドレス（責任者・リーダー＋固定宛先、提出者本人は除外・重複排除） */
async function resolveRecipients(excludeEmail: string | null): Promise<string[]> {
  const rows = await db()('users')
    .whereIn('role', ['manager', 'leader'])
    .where('status', 'active')
    .whereNotNull('email')
    .select('email');
  const set = new Set<string>();
  for (const r of rows) {
    const email = String(r.email).trim().toLowerCase();
    if (email && email !== (excludeEmail ?? '').toLowerCase()) set.add(email);
  }
  for (const e of env.mail.extraTo) set.add(e.toLowerCase());
  return [...set];
}

/** 'YYYY-MM-DD' → 'M/D' */
function shortDate(iso: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[1])}/${Number(m[2])}` : iso;
}

function buildBody(input: DailyReportMailInput): { text: string; html: string } {
  const venue = input.venueName ?? '（会場未設定）';
  const rows = input.lines.map((l) => `${l.name}：${l.count}`);
  const text = [
    `${input.submitterName} さんが日報を提出しました。`,
    '',
    `会場：${venue}`,
    `日付：${input.date}`,
    '',
    ...rows,
    '',
    'キントーンで見る：',
    input.editUrl,
  ].join('\n');

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tableRows = input.lines
    .map(
      (l) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#555;">${esc(l.name)}</td>` +
        `<td style="padding:4px 0;font-weight:700;text-align:right;">${l.count}</td></tr>`,
    )
    .join('');
  const html = `
  <div style="font-family:-apple-system,'Segoe UI','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;color:#1f2430;max-width:520px;">
    <p style="font-size:15px;margin:0 0 12px;"><b>${esc(input.submitterName)}</b> さんが日報を提出しました。</p>
    <table style="border-collapse:collapse;margin:0 0 14px;font-size:14px;">
      <tr><td style="padding:4px 14px 4px 0;color:#555;">会場</td><td style="padding:4px 0;font-weight:700;">${esc(venue)}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#555;">日付</td><td style="padding:4px 0;font-weight:700;">${esc(input.date)}</td></tr>
    </table>
    <table style="border-collapse:collapse;margin:0 0 16px;font-size:14px;border-top:1px solid #e5e7eb;">${tableRows}</table>
    <a href="${esc(input.editUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:9px 16px;border-radius:8px;font-size:14px;">キントーンで見る</a>
  </div>`;
  return { text, html };
}

/** 日報提出を通知（失敗しても例外を投げない） */
export async function notifyDailyReport(input: DailyReportMailInput): Promise<void> {
  if (!isMailEnabled()) return;
  try {
    const to = await resolveRecipients(input.submitterEmail);
    if (to.length === 0) return;

    const { text, html } = buildBody(input);
    const subject = `【日報】${input.submitterName}（${input.venueName ?? '会場未設定'}）${shortDate(input.date)}`;

    await getTransporter().sendMail({
      from: `${env.mail.fromName} <${env.mail.user}>`,
      to,
      subject,
      text,
      html,
    });
    // eslint-disable-next-line no-console
    console.log(`[notify] 日報提出メール送信: ${input.submitterName} → ${to.length}名`);
  } catch (err) {
    // 通知失敗は致命的ではない。ログのみ。
    // eslint-disable-next-line no-console
    console.error('[notify] 日報提出メールの送信に失敗:', (err as Error).message);
  }
}

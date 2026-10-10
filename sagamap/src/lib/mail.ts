import { Resend } from "resend";

import { APP_URL, OPERATOR, OPERATOR_ADDRESS } from "./config";
import { escapeHtml } from "./escape";

const from = process.env.MAIL_FROM ?? "SagaMap <noreply@sagamap.jp>";
/** 返信はお問い合わせ窓口に届くようにする */
const replyTo = OPERATOR.email;

/**
 * メール末尾の送信者情報（特定電子メール法の表示義務：送信者名・住所・問い合わせ先・配信停止）。
 * 住所が未設定のときは特定商取引法に基づく表記へのリンクを出す。
 */
export function mailFooter(unsubscribeUrl?: string) {
  const address = OPERATOR_ADDRESS
    ? escapeHtml(OPERATOR_ADDRESS)
    : `<a href="${APP_URL}/tokushoho" style="color:#888">特定商取引法に基づく表記</a>をご覧ください`;
  return `<hr style="border:none;border-top:1px solid #eee;margin:20px 0 10px">
    <p style="color:#888;font-size:12px;line-height:1.7">
      送信者：${escapeHtml(OPERATOR.name)}（${escapeHtml(OPERATOR.serviceName)}）<br>
      住所：${address}<br>
      お問い合わせ：<a href="mailto:${OPERATOR.email}" style="color:#888">${OPERATOR.email}</a>
      ${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:#888">お知らせメールの配信停止はこちら</a>` : ""}
    </p>`;
}

export async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.info(`[mail:dry-run] to=${to} subject=${subject}`);
    return { dryRun: true as const };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from, to, subject, html, replyTo });
  if (error) throw new Error(error.message);
  return { dryRun: false as const };
}

export type MailMessage = { to: string; subject: string; html: string };

/** まとめて送信（Resend の一括送信は 1 回 100 通まで） */
export async function sendMailBatch(messages: MailMessage[]) {
  if (messages.length === 0) return { sent: 0 };
  if (!process.env.RESEND_API_KEY) {
    console.info(`[mail:dry-run] batch ${messages.length} messages`);
    return { sent: 0 };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ from, replyTo, ...m }));
    const { error } = await resend.batch.send(chunk);
    if (error) throw new Error(error.message);
    sent += chunk.length;
  }
  return { sent };
}

export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY);

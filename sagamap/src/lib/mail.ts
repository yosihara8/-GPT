import { Resend } from "resend";

import { OPERATOR } from "./config";

const from = process.env.MAIL_FROM ?? "SagaMap <noreply@sagamap.jp>";
/** 返信はお問い合わせ窓口に届くようにする */
const replyTo = OPERATOR.email;

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

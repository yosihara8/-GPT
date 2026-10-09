import { Resend } from "resend";

const from = process.env.MAIL_FROM ?? "SagaMap <noreply@sagamap.jp>";

export async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.info(`[mail:dry-run] to=${to} subject=${subject}`);
    return { dryRun: true as const };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message);
  return { dryRun: false as const };
}

export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY);

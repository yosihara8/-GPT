import { APP_URL } from "./config";
import { escapeHtml } from "./escape";
import { sendMail } from "./mail";
import { createToken } from "./tokens";
import type { Role } from "./auth";

const layout = (title: string, body: string) =>
  `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
     <p style="font-size:20px;font-weight:bold">🎈 SagaMap</p><h2>${escapeHtml(title)}</h2>${body}
     <p style="color:#888;font-size:12px">このメールに心当たりがない場合は、破棄してください。</p></div>`;

export async function sendVerificationMail(role: Role, userId: number, email: string, name: string) {
  const token = await createToken("verify_email", role, userId, 7 * 24 * 60);
  const url = `${APP_URL}/verify-email?token=${token}`;
  await sendMail(
    email,
    "【SagaMap】メールアドレスの確認",
    layout(
      "メールアドレスの確認",
      `<p>${escapeHtml(name)} さん、SagaMap にご登録いただきありがとうございます。</p>
       <p>下のボタンを押して、メールアドレスの確認を完了してください（7 日間有効）。</p>
       <p><a href="${url}" style="background:#ff6b4a;color:#fff;padding:10px 20px;border-radius:9999px;text-decoration:none">メールアドレスを確認する</a></p>`,
    ),
  );
}

export async function createResetUrl(role: Role, userId: number, ttlMinutes: number) {
  const token = await createToken("reset_password", role, userId, ttlMinutes);
  return `${APP_URL}/reset-password?token=${token}`;
}

export async function sendResetMail(role: Role, userId: number, email: string) {
  const url = await createResetUrl(role, userId, 60);
  await sendMail(
    email,
    "【SagaMap】パスワードの再設定",
    layout(
      "パスワードの再設定",
      `<p>パスワード再設定のご依頼を受け付けました。下のボタンから新しいパスワードを設定してください（1 時間有効）。</p>
       <p><a href="${url}" style="background:#ff6b4a;color:#fff;padding:10px 20px;border-radius:9999px;text-decoration:none">パスワードを再設定する</a></p>`,
    ),
  );
}

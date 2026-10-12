import { APP_URL } from "./config";
import { escapeHtml } from "./escape";
import { mailFooter, sendMail } from "./mail";
import { createToken } from "./tokens";
import type { Role } from "./auth";

const layout = (title: string, body: string) =>
  `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
     <p style="font-size:20px;font-weight:bold">佐賀観光マップ</p><h2>${escapeHtml(title)}</h2>${body}
     <p style="color:#888;font-size:12px">このメールに心当たりがない場合は、破棄してください。</p>${mailFooter()}</div>`;

export async function sendVerificationMail(role: Role, userId: number, email: string, name: string) {
  const token = await createToken("verify_email", role, userId, 7 * 24 * 60);
  const url = `${APP_URL}/verify-email?token=${token}`;
  await sendMail(
    email,
    "【佐賀観光マップ】メールアドレスの確認",
    layout(
      "メールアドレスの確認",
      `<p>${escapeHtml(name)} さん、佐賀観光マップにご登録いただきありがとうございます。</p>
       <p>下のボタンを押して、メールアドレスの確認を完了してください（7 日間有効）。</p>
       <p><a href="${url}" style="background:#ff6b4a;color:#fff;padding:10px 20px;border-radius:9999px;text-decoration:none">メールアドレスを確認する</a></p>`,
    ),
  );
}

/** メールアドレスが変更されたことを、元のアドレスに知らせる */
export async function sendEmailChangedNotice(oldEmail: string, newEmail: string) {
  await sendMail(
    oldEmail,
    "【佐賀観光マップ】メールアドレスが変更されました",
    layout(
      "メールアドレスが変更されました",
      `<p>佐賀観光マップのアカウントのメールアドレスが、次のアドレスに変更されました。</p>
       <p><b>${escapeHtml(newEmail)}</b></p>
       <p>ご自身で変更した場合は、このメールは破棄してください。<br>
       心当たりがない場合は、第三者に変更された可能性があります。このメールに返信するか、サイトの「特定商取引法に基づく表記」に記載の問い合わせ先までご連絡ください。</p>`,
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
    "【佐賀観光マップ】パスワードの再設定",
    layout(
      "パスワードの再設定",
      `<p>パスワード再設定のご依頼を受け付けました。下のボタンから新しいパスワードを設定してください（1 時間有効）。</p>
       <p><a href="${url}" style="background:#ff6b4a;color:#fff;padding:10px 20px;border-radius:9999px;text-decoration:none">パスワードを再設定する</a></p>`,
    ),
  );
}

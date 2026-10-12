import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { clientIp, rateLimit, resetRateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";
import { mailEnabled, mailFooter, sendMail } from "@/lib/mail";
import { setAdminCookie } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().min(1).max(200),
  otp: z.string().max(10).optional(),
});

const WRONG = "メールアドレスまたはパスワードが正しくありません";

/**
 * 運営者のログイン（管理画面専用）。
 * 運営者はオーナー 1 人だけ（admins は 1 行）。二段階認証を設定していれば 6 桁も確認する。
 */
export async function POST(req: Request) {
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const { email, password, otp } = body.data;
  const ip = clientIp(req.headers);
  // 総当たり対策（運営者は特に厳しく：同じアカウントへ 15 分に 5 回、同じ接続元から 20 回まで）
  for (const [k, limit] of [
    [`admin-login:${email}`, 5],
    [`admin-login-ip:${ip}`, 20],
  ] as const) {
    const rl = await rateLimit(k, limit, 15 * 60);
    if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  }

  const row = await queryOne<{
    id: number;
    email: string;
    password_hash: string;
    session_version: number;
    totp_secret: string | null;
    totp_enabled_at: string | null;
    totp_last_step: string | null;
  }>("SELECT id, email, password_hash, session_version, totp_secret, totp_enabled_at, totp_last_step FROM admins WHERE email = $1", [email]);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) return NextResponse.json({ error: WRONG }, { status: 401 });

  if (row.totp_enabled_at && row.totp_secret) {
    if (!otp) return NextResponse.json({ error: "認証アプリに表示されている 6 桁の数字を入れてください", otpRequired: true }, { status: 401 });
    const step = verifyTotp(row.totp_secret, otp);
    if (step === null || (row.totp_last_step && step <= Number(row.totp_last_step))) {
      return NextResponse.json({ error: "6 桁の数字が違うか、時間切れです。最新の数字を入れてください", otpRequired: true }, { status: 401 });
    }
    await queryOne("UPDATE admins SET totp_last_step = $1 WHERE id = $2", [step, row.id]);
  }

  await resetRateLimit(`admin-login:${email}`);
  await auditLog(row.id, "管理画面にログイン", `admin:${row.id}`, ip);
  if (mailEnabled()) {
    const at = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    await sendMail(
      row.email,
      "【佐賀観光マップ】管理画面にログインしました",
      `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
        <p>管理画面にログインがありました。</p>
        <ul><li>日時：${at}</li><li>接続元：${ip.replace(/[<>&"]/g, "")}</li></ul>
        <p style="color:#b45309">心当たりがない場合は、すぐにパスワードを変更し、二段階認証を設定してください。</p>${mailFooter()}</div>`,
    ).catch(() => undefined);
  }
  return setAdminCookie(NextResponse.json({ ok: true }), row.id, row.session_version);
}

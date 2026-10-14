import { NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { getSessionUser } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendMail, mailFooter } from "@/lib/mail";
import { escapeHtml } from "@/lib/escape";
import { APP_URL, OPERATOR } from "@/lib/config";
import { ALL_INQUIRY_CATEGORIES, INQUIRY_ROLE } from "@/lib/inquiry";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "お名前を入力してください").max(60),
  email: z.string().trim().email("メールアドレスの形式が正しくありません").max(254),
  category: z.enum(ALL_INQUIRY_CATEGORIES as [string, ...string[]], { errorMap: () => ({ message: "お問い合わせの種類を選んでください" }) }),
  body: z.string().trim().min(5, "お問い合わせ内容を 5 文字以上で入力してください").max(2000, "お問い合わせ内容は 2000 文字までです"),
  agree: z.literal(true, { errorMap: () => ({ message: "プライバシーポリシーへの同意が必要です" }) }),
  // いたずら防止：人には見えない欄。入っていたら機械による送信
  website: z.string().max(0, "送信できませんでした").optional(),
});

/** お問い合わせの受け付け（運営者へ通知し、送った方に受付メールを返す） */
export async function POST(req: Request) {
  const rl = await rateLimit(`contact:${clientIp(req.headers)}`, 5, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: "送信が多すぎます。しばらく待ってから、もう一度お試しください" }, { status: 429 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const d = body.data;

  const user = await getSessionUser();
  const role = user && !user.impersonated && (user.role === "customer" || user.role === "business") ? user.role : "guest";
  const row = await queryOne<{ id: number }>(
    "INSERT INTO inquiries (role, user_id, name, email, category, body) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [role, role === "guest" ? null : user!.id, d.name, d.email, d.category, d.body],
  );
  const id = row!.id;

  const table = `<table style="font-size:14px;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;color:#666">受付番号</td><td>#${id}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">種類</td><td>${escapeHtml(d.category)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">お名前</td><td>${escapeHtml(d.name)}（${INQUIRY_ROLE[role]}）</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">メール</td><td>${escapeHtml(d.email)}</td></tr>
    </table>
    <p style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;font-size:14px">${escapeHtml(d.body)}</p>`;
  try {
    const fixed = process.env.REPORT_EMAIL?.split(",").map((e) => e.trim()).filter(Boolean) ?? [];
    const admins = fixed.length ? fixed : (await query<{ email: string }>("SELECT email FROM admins ORDER BY id")).map((a) => a.email);
    for (const a of admins) {
      await sendMail(
        a,
        `【佐賀観光マップ】お問い合わせ #${id}（${d.category}）`,
        `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:16px">
          <p style="font-size:18px;font-weight:bold">新しいお問い合わせ</p>${table}
          <p style="font-size:13px">ご返信は ${escapeHtml(d.email)} 宛てにお送りください。<a href="${APP_URL}/admin">管理画面の「お問い合わせ」</a>で対応状況を管理し、一覧を Excel で書き出せます。</p></div>`,
      );
    }
    await sendMail(
      d.email,
      `【佐賀観光マップ】お問い合わせを受け付けました（受付番号 #${id}）`,
      `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:16px">
        <p>${escapeHtml(d.name)} 様</p>
        <p>${OPERATOR.serviceName}へのお問い合わせありがとうございます。以下の内容で受け付けました。<br>内容を確認のうえ、原則 3 営業日以内に、このメールアドレスへご連絡します。</p>
        ${table}
        <p style="font-size:12px;color:#888">※ このメールは自動でお送りしています。お心当たりのない場合は、このメールを破棄してください。</p>
        ${mailFooter()}</div>`,
    );
  } catch (e) {
    // メールが送れなくても、お問い合わせは保存済み（管理画面で確認できる）
    await logServerError("contact:mail", e);
  }
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

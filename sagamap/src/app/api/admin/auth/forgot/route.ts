import { NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { sendResetMail } from "@/lib/account-mail";
import { mailEnabled } from "@/lib/mail";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません") });

/**
 * 運営者のパスワード再設定メール。運営者のメールアドレスにだけ届く（1 時間有効・1 回限り）。
 * 登録されているかどうかは答えない。二段階認証は解除されない（スマホがないとログインできないまま）。
 */
export async function POST(req: Request) {
  const rl = await rateLimit(`admin-forgot:${clientIp(req.headers)}`, 5, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const perEmail = await rateLimit(`admin-forgot-email:${body.data.email}`, 3, 60 * 60);
  if (perEmail.ok) {
    const admin = await queryOne<{ id: number }>("SELECT id FROM admins WHERE email = $1", [body.data.email]);
    if (admin) {
      try {
        await sendResetMail("admin", admin.id, body.data.email);
      } catch (e) {
        await logServerError("admin/forgot", e);
      }
    }
  }
  return NextResponse.json({ ok: true, mailEnabled: mailEnabled() });
}

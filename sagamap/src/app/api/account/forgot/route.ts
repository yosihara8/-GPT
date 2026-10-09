import { NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { ACCOUNT_TABLE } from "@/lib/accounts";
import { sendResetMail } from "@/lib/account-mail";
import { mailEnabled } from "@/lib/mail";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません"),
  role: z.enum(["customer", "business"]),
});

/** パスワード再設定メールの送信。登録の有無は答えない（他人のメールアドレス調査を防ぐ） */
export async function POST(req: Request) {
  const rl = await rateLimit(`forgot:${clientIp(req.headers)}`, 5, 15 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const { email, role } = body.data;

  const perEmail = await rateLimit(`forgot-email:${email}`, 3, 60 * 60);
  if (perEmail.ok) {
    const user = await queryOne<{ id: number }>(`SELECT id FROM ${ACCOUNT_TABLE[role]} WHERE email = $1`, [email]);
    if (user) {
      try {
        await sendResetMail(role, user.id, email);
      } catch (e) {
        await logServerError("account/forgot", e);
      }
    }
  }
  return NextResponse.json({ ok: true, mailEnabled: mailEnabled() });
}

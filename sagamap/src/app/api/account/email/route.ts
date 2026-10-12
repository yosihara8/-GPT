import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { isUniqueViolation, parseBody } from "@/lib/http";
import { ACCOUNT_TABLE } from "@/lib/accounts";
import { sendEmailChangedNotice, sendVerificationMail } from "@/lib/account-mail";
import { auditLog } from "@/lib/audit";
import { getStripe } from "@/lib/stripe";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 今のメールアドレスと、変更できるか（Google だけで登録した方はパスワードがないため変更不可） */
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id, role } = auth.user;
  const row = await queryOne<{ email: string; has_password: boolean }>(
    `SELECT email, password_hash IS NOT NULL AS has_password FROM ${ACCOUNT_TABLE[role]} WHERE id = $1`,
    [id],
  );
  return NextResponse.json({ email: row?.email ?? "", canChange: Boolean(row?.has_password) && !auth.user.impersonated });
}

const schema = z.object({
  password: z.string().min(1).max(128),
  email: z.string().trim().toLowerCase().email().max(254),
});

/** ログイン中のアカウントのメールアドレス変更（今のパスワードで本人確認） */
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id, role } = auth.user;
  if (auth.user.impersonated) {
    return NextResponse.json({ error: "代理ログイン中はメールアドレスを変更できません" }, { status: 403 });
  }
  const rl = await rateLimit(`email-change:${role}:${id}`, 5, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });

  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const table = ACCOUNT_TABLE[role];
  const row = await queryOne<{ name: string; email: string; password_hash: string | null; stripe_customer_id?: string | null }>(
    `SELECT * FROM ${table} WHERE id = $1`,
    [id],
  );
  if (!row) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  if (!row.password_hash) {
    return NextResponse.json({ error: "Google で登録したアカウントは、メールアドレスを変更できません" }, { status: 400 });
  }
  if (!(await bcrypt.compare(body.data.password, row.password_hash))) {
    return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 400 });
  }
  const next = body.data.email;
  if (next === row.email) return NextResponse.json({ error: "今と同じメールアドレスです" }, { status: 400 });

  try {
    // お客さま・事業主は新しいアドレスの確認が済むまで「未確認」に戻す
    await query(
      role === "admin"
        ? `UPDATE ${table} SET email = $1 WHERE id = $2`
        : `UPDATE ${table} SET email = $1, email_verified_at = NULL WHERE id = $2`,
      [next, id],
    );
  } catch (e) {
    if (isUniqueViolation(e)) return NextResponse.json({ error: "このメールアドレスはすでに使われています" }, { status: 409 });
    throw e;
  }
  // 古いアドレス宛ての確認リンクは使えないようにする
  await query(
    "UPDATE auth_tokens SET used_at = now() WHERE purpose IN ('verify_email', 'reset_password') AND role = $1 AND user_id = $2 AND used_at IS NULL",
    [role, id],
  );

  // 決済（Stripe）の請求先メールもそろえる（失敗しても変更自体は有効）
  if (role === "business" && row.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    await getStripe()
      .customers.update(row.stripe_customer_id, { email: next })
      .catch((e) => console.error("stripe email update failed", e));
  }
  if (role === "admin") await auditLog(id, "メールアドレスを変更", `admin#${id}`, `${row.email} → ${next}`);

  // 乗っ取り対策として、元のアドレスにも知らせる
  await Promise.allSettled([
    sendEmailChangedNotice(row.email, next),
    role === "admin" ? Promise.resolve() : sendVerificationMail(role, id, next, row.name),
  ]);
  return NextResponse.json({ ok: true, email: next, verify: role !== "admin" });
}

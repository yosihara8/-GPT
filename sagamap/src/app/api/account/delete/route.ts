import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

/** 退会の前に、本人確認の方法（パスワードか、「退会する」の入力か）を返す */
export async function GET() {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const row = await queryOne<{ has_password: boolean }>("SELECT password_hash IS NOT NULL AS has_password FROM customers WHERE id = $1", [auth.user.id]);
  return NextResponse.json({ hasPassword: Boolean(row?.has_password) });
}

const schema = z.object({ password: z.string().max(128).optional(), confirmText: z.string().max(20).optional() });

/**
 * お客さまの退会（取り消しできない）。
 * 氏名・メールアドレス・パスワード・興味・お気に入り・お知らせを消し、ログインできなくする。
 * クーポンの利用回数・紹介の人数などお店の集計は、誰か分からない形で残す（先着〇名の数がずれないように）。
 */
export async function POST(req: Request) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  if (auth.user.impersonated) return NextResponse.json({ error: "代理ログイン中は退会できません" }, { status: 403 });
  const id = auth.user.id;
  const rl = await rateLimit(`account-delete:${id}`, 10, 15 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;

  const row = await queryOne<{ password_hash: string | null }>("SELECT password_hash FROM customers WHERE id = $1 AND deleted_at IS NULL", [id]);
  if (!row) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  if (row.password_hash) {
    if (!body.data.password || !(await bcrypt.compare(body.data.password, row.password_hash))) {
      return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 400 });
    }
  } else if (body.data.confirmText?.trim() !== "退会する") {
    return NextResponse.json({ error: "確認のため「退会する」と入力してください" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM favorites WHERE customer_id = $1", [id]);
    await client.query("DELETE FROM notifications WHERE customer_id = $1", [id]);
    await client.query(
      `UPDATE customers
          SET name = '退会したお客さま', email = 'deleted-' || id || '-' || encode(gen_random_bytes(6), 'hex') || '@deleted.invalid',
              password_hash = NULL, interests = '{}', notify_enabled = false, email_verified_at = NULL,
              unsubscribe_token = encode(gen_random_bytes(16), 'hex'), session_version = session_version + 1, deleted_at = now()
        WHERE id = $1`,
      [id],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    await logServerError("account/delete", e);
    throw e;
  } finally {
    client.release();
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { ACCOUNT_TABLE, passwordRule } from "@/lib/accounts";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ current: z.string().min(1).max(128), next: z.string().max(128) });

/** ログイン中のアカウントのパスワード変更 */
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id, role } = auth.user;
  const rl = await rateLimit(`password-change:${role}:${id}`, 10, 15 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });

  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const min = passwordRule(role);
  if (body.data.next.length < min) {
    return NextResponse.json({ error: `新しいパスワードは ${min} 文字以上にしてください` }, { status: 400 });
  }
  const table = ACCOUNT_TABLE[role];
  const row = await queryOne<{ password_hash: string | null }>(`SELECT password_hash FROM ${table} WHERE id = $1`, [id]);
  if (!row?.password_hash || !(await bcrypt.compare(body.data.current, row.password_hash))) {
    return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 400 });
  }
  await query(`UPDATE ${table} SET password_hash = $1 WHERE id = $2`, [
    await bcrypt.hash(body.data.next, role === "admin" ? 12 : 10),
    id,
  ]);
  return NextResponse.json({ ok: true });
}

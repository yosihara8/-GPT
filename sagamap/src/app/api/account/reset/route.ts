import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { ACCOUNT_TABLE, passwordRule } from "@/lib/accounts";
import { consumeToken, peekToken } from "@/lib/tokens";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(10).max(100), password: z.string().max(128) });

/** 再設定リンクから新しいパスワードを設定する */
export async function POST(req: Request) {
  const rl = await rateLimit(`reset:${clientIp(req.headers)}`, 10, 15 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;

  const invalid = () =>
    NextResponse.json({ error: "リンクが無効か、有効期限が切れています。もう一度お手続きください" }, { status: 400 });
  // 長さが足りない場合は、トークンを使用済みにせずに返す
  const peek = await peekToken("reset_password", body.data.token);
  if (!peek) return invalid();
  if (body.data.password.length < passwordRule(peek.role)) {
    return NextResponse.json({ error: `パスワードは ${passwordRule(peek.role)} 文字以上にしてください` }, { status: 400 });
  }
  const owner = await consumeToken("reset_password", body.data.token);
  if (!owner) return invalid();
  const table = ACCOUNT_TABLE[owner.role];
  // パスワードを再設定できた＝メールを受け取れているので、確認済みにする
  const verify = owner.role === "admin" ? "" : ", email_verified_at = coalesce(email_verified_at, now())";
  await query(`UPDATE ${table} SET password_hash = $1${verify} WHERE id = $2`, [
    await bcrypt.hash(body.data.password, owner.role === "admin" ? 12 : 10),
    owner.user_id,
  ]);
  // 同じ人の未使用の再設定リンクは無効にする
  await query(
    "UPDATE auth_tokens SET used_at = now() WHERE purpose = 'reset_password' AND role = $1 AND user_id = $2 AND used_at IS NULL",
    [owner.role, owner.user_id],
  );
  return NextResponse.json({ ok: true, role: owner.role });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { newTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** 二段階認証の状態 */
export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const row = await queryOne<{ totp_enabled_at: string | null }>("SELECT totp_enabled_at FROM admins WHERE id = $1", [auth.user.id]);
  return NextResponse.json({ enabled: Boolean(row?.totp_enabled_at), enabledAt: row?.totp_enabled_at ?? null });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("enable"), code: z.string().max(10) }),
  z.object({ action: z.literal("disable"), password: z.string().min(1).max(128), code: z.string().max(10) }),
]);

/**
 * start: 新しい鍵を作って QR コード用の URL を返す（まだ有効にはしない）
 * enable: 認証アプリに出た 6 桁が合えば有効にする
 * disable: パスワードと 6 桁の両方が合えば解除する
 */
export async function POST(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const rl = await rateLimit(`totp:${auth.user.id}`, 10, 15 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const d = body.data;
  const row = await queryOne<{ email: string; password_hash: string; totp_secret: string | null; totp_enabled_at: string | null }>(
    "SELECT email, password_hash, totp_secret, totp_enabled_at FROM admins WHERE id = $1",
    [auth.user.id],
  );
  if (!row) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });

  if (d.action === "start") {
    if (row.totp_enabled_at) return NextResponse.json({ error: "すでに設定されています" }, { status: 400 });
    const secret = newTotpSecret();
    await query("UPDATE admins SET totp_secret = $1 WHERE id = $2", [secret, auth.user.id]);
    return NextResponse.json({ secret, url: otpauthUrl(secret, row.email) });
  }
  if (d.action === "enable") {
    if (!row.totp_secret) return NextResponse.json({ error: "最初からやり直してください" }, { status: 400 });
    const step = verifyTotp(row.totp_secret, d.code);
    if (step === null) return NextResponse.json({ error: "6 桁の数字が違います。認証アプリの最新の数字を入れてください" }, { status: 400 });
    await query("UPDATE admins SET totp_enabled_at = now(), totp_last_step = $1 WHERE id = $2", [step, auth.user.id]);
    await auditLog(auth.user.id, "二段階認証を有効化", `admin:${auth.user.id}`);
    return NextResponse.json({ ok: true });
  }
  // disable
  if (!(await bcrypt.compare(d.password, row.password_hash)) || !row.totp_secret || verifyTotp(row.totp_secret, d.code) === null) {
    return NextResponse.json({ error: "パスワードか 6 桁の数字が違います" }, { status: 400 });
  }
  await query("UPDATE admins SET totp_secret = NULL, totp_enabled_at = NULL, totp_last_step = NULL WHERE id = $1", [auth.user.id]);
  await auditLog(auth.user.id, "二段階認証を解除", `admin:${auth.user.id}`);
  return NextResponse.json({ ok: true });
}

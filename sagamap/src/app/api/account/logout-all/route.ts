import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ACCOUNT_TABLE } from "@/lib/accounts";
import { requireAccountUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** すべての端末からログアウト（スマホをなくした・知らない端末でログインしたかもしれないとき） */
export async function POST(req: Request) {
  const auth = await requireAccountUser(req);
  if (!auth.ok) return auth.response;
  if (auth.user.impersonated) return NextResponse.json({ error: "代理ログイン中は使えません" }, { status: 403 });
  await query(`UPDATE ${ACCOUNT_TABLE[auth.user.role]} SET session_version = session_version + 1 WHERE id = $1`, [auth.user.id]);
  return NextResponse.json({ ok: true });
}

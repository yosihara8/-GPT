import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 「有料プランになりました」のお知らせを表示した（もう出さない） */
export async function POST() {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  // 運営者が代理でログインして見たときは、本人に出すお知らせを消さない
  if (!auth.user.impersonated) await query("UPDATE business_owners SET premium_notice_pending = false WHERE id = $1", [auth.user.id]);
  return NextResponse.json({ ok: true });
}

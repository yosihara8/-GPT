import { NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { auditLog } from "@/lib/audit";
import { pendingReviews } from "@/lib/content-review";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 掲載チェックの確認待ち一覧 */
export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ items: await pendingReviews() });
}

const actionSchema = z.object({
  type: z.enum(["coupon", "ad"]),
  id: z.coerce.number().int().positive(),
  action: z.enum(["approve", "stop"]),
});

/** 確認結果：approve = 問題なし（掲載を続ける） / stop = 掲載を停止 */
export async function PATCH(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, actionSchema);
  if (!body.ok) return body.response;
  const { type, id, action } = body.data;
  const table = type === "coupon" ? "coupons" : "ads";
  const set = action === "approve" ? "reviewed_at = now()" : "is_active = false, reviewed_at = now()";
  const row = await queryOne(`UPDATE ${table} SET ${set} WHERE id = $1 RETURNING id`, [id]);
  if (!row) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  await auditLog(auth.user.id, action === "approve" ? "掲載チェック：問題なし" : "掲載チェック：停止", `${table}#${id}`);
  return NextResponse.json({ ok: true });
}

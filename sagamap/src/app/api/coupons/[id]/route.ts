import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * クーポンの削除（事業主）。お客さまの画面からすぐ消える。
 * 利用回数・帳簿のため、データは消さずに「削除済み」にする。
 */
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const row = await queryOne(
    `UPDATE coupons c SET is_active = false, deleted_at = now()
       FROM businesses b
      WHERE c.id = $1 AND b.id = c.business_id AND b.owner_id = $2 AND c.deleted_at IS NULL
      RETURNING c.id`,
    [Number(params.id), auth.user.id],
  );
  if (!row) return NextResponse.json({ error: "クーポンが見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

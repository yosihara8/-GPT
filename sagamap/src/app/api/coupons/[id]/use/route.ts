import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * クーポン利用（店頭で提示 → 利用済みにする）。利用履歴は AI 推薦の学習データになる
 *  - ふつうは 1 人 1 回。「何度でも」のクーポンは 1 日 1 回まで
 *  - 先着の人数に達したら使えない
 *  - 「初めての方限定」は、そのお店のクーポンを使ったことがない人だけ
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const couponId = Number(params.id);

  const coupon = await queryOne<{ business_id: number; max_uses: number | null; repeatable: boolean; first_visit_only: boolean; used_count: number }>(
    `SELECT business_id, max_uses, repeatable, first_visit_only,
            (SELECT count(*) FROM usage_history h WHERE h.coupon_id = c.id AND h.coupon_used)::int AS used_count
       FROM coupons c WHERE id = $1 AND is_active AND expires_at > now()`,
    [couponId],
  );
  if (!coupon) return NextResponse.json({ error: "クーポンが見つからないか期限切れです" }, { status: 404 });

  const used = await queryOne(
    `SELECT 1 FROM usage_history WHERE customer_id = $1 AND coupon_id = $2 AND coupon_used
        ${coupon.repeatable ? "AND (viewed_at AT TIME ZONE 'Asia/Tokyo')::date = (now() AT TIME ZONE 'Asia/Tokyo')::date" : ""}`,
    [auth.user.id, couponId],
  );
  if (used) {
    return NextResponse.json(
      { error: coupon.repeatable ? "このクーポンは今日すでに使いました（明日また使えます）" : "このクーポンは利用済みです" },
      { status: 409 },
    );
  }
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ error: "先着の人数に達したため、このクーポンは終了しました" }, { status: 409 });
  }
  if (coupon.first_visit_only) {
    const before = await queryOne(
      "SELECT 1 FROM usage_history WHERE customer_id = $1 AND business_id = $2 AND coupon_used",
      [auth.user.id, coupon.business_id],
    );
    if (before) return NextResponse.json({ error: "このクーポンは、初めてこのお店をご利用の方限定です" }, { status: 409 });
  }

  await queryOne(
    `INSERT INTO usage_history (customer_id, business_id, coupon_id, coupon_used) VALUES ($1, $2, $3, true)`,
    [auth.user.id, coupon.business_id, couponId],
  );
  return NextResponse.json({ ok: true });
}

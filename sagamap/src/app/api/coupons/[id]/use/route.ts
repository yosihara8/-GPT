import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** クーポン利用（店頭で提示 → 利用済みにする）。利用履歴は AI 推薦の学習データになる */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const couponId = Number(params.id);

  const coupon = await queryOne<{ business_id: number }>(
    "SELECT business_id FROM coupons WHERE id = $1 AND is_active AND expires_at > now()",
    [couponId],
  );
  if (!coupon) return NextResponse.json({ error: "クーポンが見つからないか期限切れです" }, { status: 404 });

  const used = await queryOne(
    "SELECT 1 FROM usage_history WHERE customer_id = $1 AND coupon_id = $2 AND coupon_used",
    [auth.user.id, couponId],
  );
  if (used) return NextResponse.json({ error: "このクーポンは利用済みです" }, { status: 409 });

  await queryOne(
    `INSERT INTO usage_history (customer_id, business_id, coupon_id, coupon_used) VALUES ($1, $2, $3, true)`,
    [auth.user.id, coupon.business_id, couponId],
  );
  return NextResponse.json({ ok: true });
}

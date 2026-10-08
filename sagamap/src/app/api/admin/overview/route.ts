import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 管理画面の概要（登録数・有料プラン数・見込み月商など） */
export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const stats = await queryOne(
    `SELECT
       (SELECT count(*) FROM customers)::int AS customers,
       (SELECT count(*) FROM customers WHERE created_at > now() - interval '7 days')::int AS customers_7d,
       (SELECT count(*) FROM business_owners)::int AS owners,
       (SELECT count(*) FROM business_owners WHERE plan = 'premium')::int AS premium_owners,
       (SELECT coalesce(sum(monthly_price), 0) FROM business_owners WHERE plan = 'premium')::int AS monthly_revenue,
       (SELECT count(*) FROM businesses)::int AS stores,
       (SELECT count(*) FROM coupons WHERE is_active AND expires_at > now())::int AS active_coupons,
       (SELECT count(*) FROM usage_history WHERE coupon_used AND viewed_at > now() - interval '30 days')::int AS coupon_uses_30d,
       (SELECT count(*) FROM referrals)::int AS referrals`,
  );
  return NextResponse.json({ stats });
}

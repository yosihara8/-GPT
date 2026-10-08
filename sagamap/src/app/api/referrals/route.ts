import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { PRICE_DISCOUNT, PRICE_STANDARD, REFERRAL_GOAL, referralUrl } from "@/lib/config";
import { getOwnerPlan, requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 紹介ダッシュボード用データ（事業主） */
export async function GET() {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const ownerId = auth.user.id;

  const plan = await getOwnerPlan(ownerId);
  const stores = await query<{ id: number; name: string; count: number }>(
    `SELECT b.id, b.name, count(r.id)::int AS count
       FROM businesses b LEFT JOIN referrals r ON r.business_id = b.id
      WHERE b.owner_id = $1 GROUP BY b.id ORDER BY b.id`,
    [ownerId],
  );
  const customers = await query(
    `SELECT c.email, r.created_at AS registered_at, b.name AS business_name
       FROM referrals r JOIN customers c ON c.id = r.customer_id JOIN businesses b ON b.id = r.business_id
      WHERE b.owner_id = $1 ORDER BY r.created_at DESC`,
    [ownerId],
  );
  const total = stores.reduce((s, b) => s + b.count, 0);

  return NextResponse.json({
    plan: plan?.plan,
    monthlyPrice: plan?.monthly_price ?? PRICE_STANDARD,
    standardPrice: PRICE_STANDARD,
    discountPrice: PRICE_DISCOUNT,
    goal: REFERRAL_GOAL,
    total,
    discountApplied: plan?.monthly_price === PRICE_DISCOUNT,
    stores: stores.map((s) => ({ ...s, url: referralUrl(s.id) })),
    customers,
  });
}

/** 紹介元店舗の確認（顧客登録画面で「○○さんからの紹介」を表示）: POST { bizId } */
export async function POST(req: Request) {
  const { bizId } = (await req.json().catch(() => ({}))) as { bizId?: number };
  const biz = await queryOne("SELECT id, name FROM businesses WHERE id = $1", [Number(bizId)]);
  if (!biz) return NextResponse.json({ error: "紹介元の店舗が見つかりません" }, { status: 404 });
  return NextResponse.json({ business: biz });
}

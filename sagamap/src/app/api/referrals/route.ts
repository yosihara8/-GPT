import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { PRICE_DISCOUNT, PRICE_STANDARD, REFERRAL_GOAL, referralUrl } from "@/lib/config";
import { monthlyReferralCounts } from "@/lib/referral";
import { getOwnerPlan, requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 紹介ダッシュボード用データ（事業主）。紹介人数は毎月 1 日〜末日で数える */
export async function GET() {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const ownerId = auth.user.id;

  const plan = await getOwnerPlan(ownerId);
  const history = await monthlyReferralCounts(ownerId, 6);
  const thisMonth = history[0]?.count ?? 0;
  const lastMonth = history[1]?.count ?? 0;

  const stores = await query<{ id: number; name: string; count: number }>(
    `SELECT b.id, b.name,
            (SELECT count(*) FROM referrals r WHERE r.business_id = b.id
              AND date_trunc('month', r.created_at AT TIME ZONE 'Asia/Tokyo') = date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo'))::int AS count
       FROM businesses b WHERE b.owner_id = $1 ORDER BY b.id`,
    [ownerId],
  );
  const customers = await query(
    `SELECT c.email, r.created_at AS registered_at, b.name AS business_name
       FROM referrals r JOIN customers c ON c.id = r.customer_id JOIN businesses b ON b.id = r.business_id
      WHERE b.owner_id = $1 ORDER BY r.created_at DESC LIMIT 200`,
    [ownerId],
  );
  const period = await queryOne<{ start: string; end: string; next: string }>(
    `SELECT to_char(m, 'FMMM"月"FMDD"日"') AS start,
            to_char(m + interval '1 month' - interval '1 day', 'FMMM"月"FMDD"日"') AS end,
            to_char(m + interval '1 month', 'FMMM"月"') AS next
       FROM (SELECT date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AS m) t`,
  );

  return NextResponse.json({
    plan: plan?.plan,
    goal: REFERRAL_GOAL,
    standardPrice: PRICE_STANDARD,
    discountPrice: PRICE_DISCOUNT,
    currentPrice: plan?.monthly_price ?? PRICE_STANDARD,
    thisMonth: { count: thisMonth, achieved: thisMonth >= REFERRAL_GOAL, ...period },
    lastMonth: { count: lastMonth, achieved: lastMonth >= REFERRAL_GOAL },
    history: history.map((h) => ({ ...h, achieved: h.count >= REFERRAL_GOAL })),
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

import { query, queryOne } from "./db";
import { PRICE_DISCOUNT, PRICE_STANDARD, REFERRAL_GOAL } from "./config";
import { getStripe } from "./stripe";

/**
 * 紹介プログラム
 *  事業者の紹介リンクからお客さまが SagaMap に会員登録すると「紹介 1 名」。
 *  毎月 1 日〜末日（日本時間）の紹介人数を数え、10 名以上なら翌月の月額が 3,980 円 → 2,980 円。
 */

/** お客さまを紹介元の店舗に紐づける */
export async function recordReferral(customerId: number, businessId: number) {
  await query(
    `INSERT INTO referrals (business_id, customer_id)
     SELECT id, $2 FROM businesses WHERE id = $1
     ON CONFLICT (customer_id) DO NOTHING`,
    [businessId, customerId],
  );
}

const MONTH_OF = (col: string) => `date_trunc('month', ${col} AT TIME ZONE 'Asia/Tokyo')`;
const THIS_MONTH = MONTH_OF("now()");

/** 事業者の月別の紹介人数（直近 n か月。今月を含む） */
export async function monthlyReferralCounts(ownerId: number, months = 6) {
  return query<{ month: string; count: number }>(
    `SELECT to_char(m, 'YYYY-MM') AS month,
            (SELECT count(*) FROM referrals r JOIN businesses b ON b.id = r.business_id
              WHERE b.owner_id = $1 AND ${MONTH_OF("r.created_at")} = m)::int AS count
       FROM generate_series(${THIS_MONTH} - make_interval(months => $2 - 1), ${THIS_MONTH}, interval '1 month') AS m
      ORDER BY m DESC`,
    [ownerId, months],
  );
}

/** 指定した月の紹介人数 */
async function countInMonth(ownerId: number, monthOffset: number) {
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM referrals r JOIN businesses b ON b.id = r.business_id
      WHERE b.owner_id = $1 AND ${MONTH_OF("r.created_at")} = ${THIS_MONTH} + make_interval(months => $2)`,
    [ownerId, monthOffset],
  );
  return row?.n ?? 0;
}

export const referralsThisMonth = (ownerId: number) => countInMonth(ownerId, 0);
export const referralsLastMonth = (ownerId: number) => countInMonth(ownerId, -1);

/**
 * 毎月の判定（毎月 1 日に実行）。
 * 前月の紹介人数で今月の月額を決め、Stripe の契約があれば料金を差し替える（次回のご請求から反映）。
 */
export async function applyMonthlyReferralPricing() {
  const owners = await query<{ id: number; monthly_price: number; stripe_subscription_id: string | null }>(
    "SELECT id, monthly_price, stripe_subscription_id FROM business_owners",
  );
  let discounted = 0;
  let changed = 0;
  for (const o of owners) {
    const count = await referralsLastMonth(o.id);
    const achieved = count >= REFERRAL_GOAL;
    await query(
      `INSERT INTO referral_monthly_results (owner_id, month, referral_count, achieved)
       VALUES ($1, (${THIS_MONTH} - interval '1 month')::date, $2, $3)
       ON CONFLICT (owner_id, month) DO UPDATE SET referral_count = EXCLUDED.referral_count, achieved = EXCLUDED.achieved`,
      [o.id, count, achieved],
    );
    const price = achieved ? PRICE_DISCOUNT : PRICE_STANDARD;
    if (achieved) discounted++;
    if (o.monthly_price === price) continue;

    const priceId = achieved ? process.env.STRIPE_PRICE_DISCOUNT : process.env.STRIPE_PRICE_STANDARD;
    if (o.stripe_subscription_id && priceId) {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(o.stripe_subscription_id);
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: sub.items.data[0].id, price: priceId }],
        proration_behavior: "none",
      });
    }
    await query("UPDATE business_owners SET monthly_price = $1 WHERE id = $2", [price, o.id]);
    changed++;
  }
  return { owners: owners.length, discounted, changed };
}

import { query, queryOne } from "./db";
import { PRICE_DISCOUNT, REFERRAL_GOAL } from "./config";
import { getStripe } from "./stripe";

/** 新規顧客を紹介元店舗に紐づけ、目標達成なら割引を適用する */
export async function recordReferral(customerId: number, businessId: number) {
  const biz = await queryOne<{ owner_id: number }>("SELECT owner_id FROM businesses WHERE id = $1", [businessId]);
  if (!biz) return;
  await query(
    "INSERT INTO referrals (business_id, customer_id) VALUES ($1, $2) ON CONFLICT (customer_id) DO NOTHING",
    [businessId, customerId],
  );
  await applyReferralDiscountIfEligible(biz.owner_id);
}

export async function referralCountForOwner(ownerId: number) {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*) FROM referrals r JOIN businesses b ON b.id = r.business_id WHERE b.owner_id = $1`,
    [ownerId],
  );
  return Number(row?.count ?? 0);
}

/**
 * 紹介 10 名達成で月額 3,980 円 → 2,980 円。
 * Stripe サブスクリプションがあれば Price を差し替え（次回請求から反映）。
 */
export async function applyReferralDiscountIfEligible(ownerId: number) {
  const owner = await queryOne<{ monthly_price: number; stripe_subscription_id: string | null }>(
    "SELECT monthly_price, stripe_subscription_id FROM business_owners WHERE id = $1",
    [ownerId],
  );
  if (!owner || owner.monthly_price === PRICE_DISCOUNT) return false;
  if ((await referralCountForOwner(ownerId)) < REFERRAL_GOAL) return false;

  if (owner.stripe_subscription_id && process.env.STRIPE_PRICE_DISCOUNT) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(owner.stripe_subscription_id);
    await stripe.subscriptions.update(sub.id, {
      items: [{ id: sub.items.data[0].id, price: process.env.STRIPE_PRICE_DISCOUNT }],
      proration_behavior: "none",
    });
  }
  await query("UPDATE business_owners SET monthly_price = $1 WHERE id = $2", [PRICE_DISCOUNT, ownerId]);
  return true;
}

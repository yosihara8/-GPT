import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { APP_URL, PRICE_DISCOUNT } from "@/lib/config";
import { getStripe } from "@/lib/stripe";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing
 *  - 無料プラン: Stripe Checkout（サブスクリプション）の URL を返す
 *  - 有料プラン: Stripe カスタマーポータル（解約・カード変更）の URL を返す
 */
export async function POST() {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const owner = await queryOne<{
    id: number;
    email: string;
    plan: string;
    monthly_price: number;
    stripe_customer_id: string | null;
  }>("SELECT id, email, plan, monthly_price, stripe_customer_id FROM business_owners WHERE id = $1", [auth.user.id]);
  if (!owner) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "決済（Stripe）が未設定です。管理者にお問い合わせください" }, { status: 503 });
  }
  const stripe = getStripe();

  if (owner.plan === "premium" && owner.stripe_customer_id) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: owner.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/business`,
    });
    return NextResponse.json({ url: portal.url });
  }

  // 紹介 10 名を達成済みなら最初から割引価格で契約
  const price =
    owner.monthly_price === PRICE_DISCOUNT ? process.env.STRIPE_PRICE_DISCOUNT : process.env.STRIPE_PRICE_STANDARD;
  if (!price) return NextResponse.json({ error: "Stripe の Price ID が未設定です" }, { status: 503 });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(owner.stripe_customer_id ? { customer: owner.stripe_customer_id } : { customer_email: owner.email }),
    client_reference_id: String(owner.id),
    metadata: { owner_id: String(owner.id) },
    subscription_data: { metadata: { owner_id: String(owner.id) } },
    success_url: `${APP_URL}/dashboard/business?upgraded=1`,
    cancel_url: `${APP_URL}/upgrade?canceled=1`,
    locale: "ja",
  });
  return NextResponse.json({ url: session.url });
}

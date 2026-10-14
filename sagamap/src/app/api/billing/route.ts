import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { APP_URL, PRICE_DISCOUNT } from "@/lib/config";
import { getStripe, stripeEnv } from "@/lib/stripe";
import { requireApiUser } from "@/lib/session";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing
 *  - 無料プラン: Stripe Checkout（サブスクリプション）の URL を返す
 *  - 有料プラン: Stripe カスタマーポータル（解約・カード変更）の URL を返す
 *  - 特別招待プラン: { leaveSpecial: true } のときだけ申し込みに進める（お支払いが済むまでは特別招待のまま。
 *    完了すると Webhook で特別招待が外れ、二度と戻れない）
 */
export async function POST(req: Request) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const owner = await queryOne<{
    id: number;
    email: string;
    plan: string;
    monthly_price: number;
    stripe_customer_id: string | null;
    complimentary: boolean;
  }>("SELECT id, email, plan, monthly_price, stripe_customer_id, complimentary FROM business_owners WHERE id = $1", [auth.user.id]);
  if (!owner) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { leaveSpecial?: unknown };
  if (owner.complimentary && body.leaveSpecial !== true) {
    return NextResponse.json({ error: "特別招待プランのため、お支払いの手続きは不要です" }, { status: 400 });
  }

  if (!stripeEnv("STRIPE_SECRET_KEY")) {
    return NextResponse.json({ error: "決済（Stripe）が未設定です。管理者にお問い合わせください" }, { status: 503 });
  }
  const stripe = getStripe();

  try {
    // 有料プラン中、または Stripe 側に有効な契約が残っている場合はポータルへ（二重契約を防ぐ）
    let hasActive = owner.plan === "premium" && !owner.complimentary;
    if (!hasActive && owner.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({ customer: owner.stripe_customer_id, status: "all", limit: 10 });
      hasActive = subs.data.some((s) => ["active", "trialing", "past_due"].includes(s.status));
    }
    if (hasActive && owner.stripe_customer_id) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: owner.stripe_customer_id,
        return_url: `${APP_URL}/dashboard/business`,
      });
      return NextResponse.json({ url: portal.url });
    }

    // 紹介 10 名を達成済みなら最初から割引価格で契約
    const price =
      owner.monthly_price === PRICE_DISCOUNT ? stripeEnv("STRIPE_PRICE_DISCOUNT") : stripeEnv("STRIPE_PRICE_STANDARD");
    if (!price) return NextResponse.json({ error: "Stripe の Price ID が未設定です" }, { status: 503 });

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        ...(owner.stripe_customer_id ? { customer: owner.stripe_customer_id } : { customer_email: owner.email }),
        client_reference_id: String(owner.id),
        metadata: { owner_id: String(owner.id) },
        subscription_data: { metadata: { owner_id: String(owner.id) } },
        success_url: `${APP_URL}/dashboard/business?upgraded=1`,
        cancel_url: `${APP_URL}/upgrade?canceled=1`,
        locale: "ja",
      },
      // 短時間にボタンを 2 回押しても、申し込み画面は 1 つだけ作る
      { idempotencyKey: `checkout-${owner.id}-${price}-${Math.floor(Date.now() / 60000)}` },
    );
    return NextResponse.json({ url: session.url });
  } catch (e) {
    await logServerError("billing", e);
    return NextResponse.json({ error: stripeErrorMessage(e) }, { status: 502 });
  }
}

/** Stripe のエラーを、運営者・事業主に分かる日本語にする */
function stripeErrorMessage(e: unknown) {
  const err = e as { type?: string; code?: string; message?: string };
  const detail = err.message ? `（${err.message}）` : "";
  if (err.type === "StripeAuthenticationError") return `決済の設定（シークレットキー）が正しくありません。管理者にお問い合わせください${detail}`;
  if (err.code === "resource_missing") {
    return `決済の設定（料金 ID）が見つかりません。テスト用と本番用のキー・料金 ID が混ざっていないか確認してください${detail}`;
  }
  if (err.type === "StripePermissionError" || /activat|verif|cannot currently/i.test(err.message ?? "")) {
    return `決済アカウントの有効化（本人確認など）が完了していないため、お申し込みを受け付けられません${detail}`;
  }
  return `決済でエラーが発生しました。時間をおいて再度お試しください${detail}`;
}

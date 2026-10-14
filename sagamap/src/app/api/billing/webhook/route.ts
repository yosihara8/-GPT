import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { pool } from "@/lib/db";
import { getStripe, stripeEnv } from "@/lib/stripe";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

/** Stripe Webhook: https://www.saga-kanko-map.com/api/billing/webhook */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = stripeEnv("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch (e) {
    return NextResponse.json({ error: `invalid signature: ${(e as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const ownerId = Number(s.metadata?.owner_id ?? s.client_reference_id);
      if (ownerId && s.subscription) {
        await setPlan(ownerId, "premium", {
          customerId: String(s.customer),
          subscriptionId: String(s.subscription),
          endsAt: null,
          leaveSpecial: true,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const ownerId = Number(sub.metadata?.owner_id);
      if (!ownerId) break;
      const active = event.type === "customer.subscription.updated" && ["active", "trialing", "past_due"].includes(sub.status);
      await setPlan(ownerId, active ? "premium" : "free", {
        customerId: String(sub.customer),
        subscriptionId: active ? sub.id : null,
        // 解約手続き済みなら、支払い済みの期間の最終日まで有料プランのまま（その日に subscription.deleted が届く）
        endsAt: active && sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
      });
      break;
    }
  }
  return NextResponse.json({ received: true });
}

async function setPlan(
  ownerId: number,
  plan: "free" | "premium",
  stripeIds: { customerId: string; subscriptionId: string | null; endsAt: Date | null; leaveSpecial?: boolean },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE business_owners SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3, plan_ends_at = $4 WHERE id = $5`,
      [plan, stripeIds.customerId, stripeIds.subscriptionId, stripeIds.endsAt, ownerId],
    );
    // 特別招待の事業主が有料プランを申し込んだら、特別招待は終了（戻れない）
    if (stripeIds.leaveSpecial) {
      await client.query(
        `UPDATE business_owners
            SET complimentary = false, special_ended_at = COALESCE(special_ended_at, now()),
                monthly_price = CASE WHEN monthly_price = 0 THEN 3980 ELSE monthly_price END
          WHERE id = $1 AND complimentary`,
        [ownerId],
      );
    }
    await client.query("UPDATE businesses SET is_premium = $1 WHERE owner_id = $2", [plan === "premium", ownerId]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    await logServerError("billing/webhook", e);
    throw e;
  } finally {
    client.release();
  }
}

import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Stripe の設定値を読む。貼り付け時に紛れ込みやすい空白・改行・「名前=」を取り除く
 * （キーに空白や改行が残ると、通信ヘッダーが不正になり「接続エラー」になる）
 */
export function stripeEnv(name: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "STRIPE_PRICE_STANDARD" | "STRIPE_PRICE_DISCOUNT") {
  const raw = process.env[name];
  if (!raw) return undefined;
  const v = raw
    .replace(new RegExp(`^\\s*${name}\\s*=`), "")
    .replace(/^["']|["']$/g, "")
    .replace(/[\s​-‍﻿]+/g, "");
  return v || undefined;
}

export function getStripe() {
  const key = stripeEnv("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

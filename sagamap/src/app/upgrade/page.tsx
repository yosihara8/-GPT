"use client";

import BizPage from "@/components/business/BizPage";
import { FREE_FEATURES, PREMIUM_FEATURES, PlanCard } from "@/components/business/PlanParts";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/fetcher";
import { PRICE_DISCOUNT, PRICE_STANDARD, REFERRAL_GOAL } from "@/lib/config";


export default function UpgradePage() {
  return (
    <Suspense>
      <Upgrade />
    </Suspense>
  );
}

function Upgrade() {
  const params = useSearchParams();
  const [plan, setPlan] = useState<"free" | "premium" | null>(null);
  const [special, setSpecial] = useState(false);
  const [price, setPrice] = useState(PRICE_STANDARD);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ owner: { plan: "free" | "premium"; monthly_price: number; complimentary?: boolean; plan_ends_at?: string | null } }>("/api/me").then((d) => {
      setPlan(d.owner.plan);
      setEndsAt(d.owner.plan_ends_at ?? null);
      setSpecial(Boolean(d.owner.complimentary));
      setPrice(d.owner.monthly_price);
    });
  }, []);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/billing", { method: "POST" });
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <BizPage eyebrow="PLAN" title="プランの変更" lead="お支払いは Stripe で安全に処理されます。いつでも解約できます。">
      {params.get("canceled") && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">お手続きはキャンセルされました。</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PlanCard title="無料プラン" price="0 円" features={FREE_FEATURES} current={plan === "free"} tone="tea" />
        <PlanCard
          title="有料プラン"
          price={`月額 ${price.toLocaleString()} 円（税込）`}
          note={price === PRICE_DISCOUNT ? "紹介割引適用中" : `月 ${REFERRAL_GOAL} 名の紹介で翌月 ${PRICE_DISCOUNT.toLocaleString()} 円`}
          features={PREMIUM_FEATURES}
          current={plan === "premium"}
          tone="coral"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {special && (
        <p className="rounded-2xl bg-tea-50 px-4 py-3 text-sm font-bold text-tea-700">
          特別招待により、有料プランのすべての機能を無料でご利用いただけます。お支払いの手続きは不要です。
        </p>
      )}
      {plan === "premium" && endsAt && (
        <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700">
          解約の手続きが済んでいます。<b>{new Date(endsAt).toLocaleDateString("ja-JP")}</b>
          まではお支払い済みのため、有料プランをそのまま使えます。その日を過ぎると無料プランに戻ります。続ける場合は、下のボタンから解約を取り消せます。
        </p>
      )}
      {plan && !special && (
        <button onClick={checkout} disabled={loading} className={plan === "premium" ? "btn-primary btn-lg" : "btn-accent btn-lg"}>
          {loading
            ? "Stripe に移動中…"
            : plan === "premium"
              ? "お支払い方法の変更・解約（Stripe）"
              : `有料プランに申し込む（月額 ${price.toLocaleString()} 円）`}
        </button>
      )}
    </BizPage>
  );
}

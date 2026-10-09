"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/fetcher";
import { PRICE_DISCOUNT, PRICE_STANDARD, REFERRAL_GOAL } from "@/lib/config";

const FREE = ["店舗登録（1 店舗）", "地図への掲載・基本情報表示", "閲覧数・クーポン利用数の統計", "時間帯別の集客分析"];
const PREMIUM = [
  "クーポン発行（割引率・有効期限・利用条件）",
  "広告出稿（地図上のバナー枠・月 2 回まで）",
  "SNS 連携（Instagram・X）",
  `紹介割引（毎月 1 日〜末日に ${REFERRAL_GOAL} 名紹介で、翌月 ${PRICE_DISCOUNT.toLocaleString()} 円）`,
  "複数店舗の登録",
];

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
  const [price, setPrice] = useState(PRICE_STANDARD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ owner: { plan: "free" | "premium"; monthly_price: number } }>("/api/me").then((d) => {
      setPlan(d.owner.plan);
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
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Link href="/dashboard/business" className="text-sm text-saga-600">
        ← ダッシュボード
      </Link>
      <h1 className="text-2xl font-bold">プランの変更</h1>
      {params.get("canceled") && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">お手続きはキャンセルされました。</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PlanCard title="無料プラン" price="0 円" items={FREE} current={plan === "free"} />
        <PlanCard
          title="有料プラン"
          price={`月額 ${price.toLocaleString()} 円（税込）`}
          note={price === PRICE_DISCOUNT ? "紹介割引適用中" : `月 ${REFERRAL_GOAL} 名の紹介で翌月 ${PRICE_DISCOUNT.toLocaleString()} 円`}
          items={PREMIUM}
          current={plan === "premium"}
          highlight
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {plan && (
        <button onClick={checkout} disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading
            ? "Stripe に移動中…"
            : plan === "premium"
              ? "お支払い方法の変更・解約（Stripe）"
              : `有料プランに申し込む（月額 ${price.toLocaleString()} 円）`}
        </button>
      )}
      <p className="text-center text-xs text-slate-500">お支払いは Stripe で安全に処理されます。いつでも解約できます。</p>
    </main>
  );
}

function PlanCard(props: { title: string; price: string; note?: string; items: string[]; current: boolean; highlight?: boolean }) {
  return (
    <div className={`card ${props.highlight ? "border-2 border-saga-600" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{props.title}</h2>
        {props.current && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">ご利用中</span>}
      </div>
      <p className="mt-2 text-2xl font-black">{props.price}</p>
      {props.note && <p className="text-xs text-saga-700">{props.note}</p>}
      <ul className="mt-3 space-y-1.5 text-sm">
        {props.items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="text-saga-600">✓</span>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

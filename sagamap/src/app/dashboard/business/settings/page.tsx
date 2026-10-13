"use client";

import Link from "next/link";
import { ChevronRight, CreditCard, FileBarChart } from "lucide-react";
import BizPage from "@/components/business/BizPage";
import { useOwnerData } from "@/components/business/useOwnerData";
import { FREE_FEATURES, PREMIUM_FEATURES, PlanCard } from "@/components/business/PlanParts";
import EmailChangeForm from "@/components/EmailChangeForm";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import { PRICE_STANDARD } from "@/lib/config";

/** 事業主の設定（プラン・お支払い・レポートメール・メールアドレス・パスワード） */
export default function BusinessSettingsPage() {
  const { owner, premium, load } = useOwnerData();
  return (
    <BizPage eyebrow="SETTINGS" title="設定" lead={owner?.email}>
      <section id="plan" className="card space-y-3 scroll-mt-20">
        <h2 className="flex items-center gap-1.5 font-bold">
          <CreditCard className="h-4 w-4 text-saga-600" aria-hidden />
          プラン・お支払い
        </h2>
        {premium && owner?.plan_ends_at && (
          <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coupon">
            解約手続き済み・{new Date(owner.plan_ends_at).toLocaleDateString("ja-JP")}まで有料プランを使えます
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <PlanCard current={!premium} title="無料プラン" price="0 円" tone="tea" features={FREE_FEATURES} />
          <PlanCard
            current={premium}
            title={owner?.complimentary ? "有料プラン（特別招待）" : "有料プラン"}
            price={owner?.complimentary ? "0 円（特別招待）" : `月額 ${(premium ? (owner?.monthly_price ?? PRICE_STANDARD) : PRICE_STANDARD).toLocaleString()} 円（税込）`}
            tone="coral"
            features={PREMIUM_FEATURES}
          />
        </div>
        {!owner?.complimentary && (
          <Link href="/upgrade" className={premium ? "btn-outline w-full" : "btn-accent btn-lg"}>
            {premium ? "お支払い方法の変更・解約" : "有料プランにする"}
          </Link>
        )}
      </section>

      <Link href="/dashboard/business/report#settings" className="card flex items-center gap-3 hover:bg-slate-50">
        <FileBarChart className="h-5 w-5 shrink-0 text-saga-600" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">月次レポートのメール</span>
          <span className="block text-xs text-slate-500">毎月 1 日に先月のレポートが届きます（受け取りの設定）</span>
        </span>
        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
      </Link>

      <EmailChangeForm onChanged={load} />
      <PasswordChangeForm />
    </BizPage>
  );
}

"use client";

import Link from "next/link";
import { ChevronRight, CreditCard, FileBarChart } from "lucide-react";
import BizPage from "@/components/business/BizPage";
import { useOwnerData } from "@/components/business/useOwnerData";
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
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <span className="min-w-0">
            <span className="block text-xs text-slate-500">ご利用中のプラン</span>
            <span className="block font-bold">{owner ? (owner.complimentary ? "特別招待プラン" : premium ? "有料プラン" : "無料プラン") : "…"}</span>
          </span>
          <span className="num shrink-0 text-right font-bold">
            {owner?.complimentary ? "0 円・期限なし" : premium ? `月額 ${(owner?.monthly_price ?? PRICE_STANDARD).toLocaleString()} 円` : "0 円"}
          </span>
        </div>
        <Link href="/upgrade" className={premium || owner?.complimentary ? "btn-outline btn-lg" : "btn-accent btn-lg"}>
          {premium || owner?.complimentary ? "プランを変更する" : "プランを変更する（有料プランにする）"}
        </Link>
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

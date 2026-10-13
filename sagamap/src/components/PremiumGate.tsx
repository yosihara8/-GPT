"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import BizPage from "@/components/business/BizPage";

/** 有料プラン限定ページのガード */
export default function PremiumGate({ title, eyebrow, lead, children }: { title: string; eyebrow: string; lead?: string; children: React.ReactNode }) {
  const [plan, setPlan] = useState<"free" | "premium" | null>(null);
  useEffect(() => {
    api<{ owner: { plan: "free" | "premium" } }>("/api/me").then((d) => setPlan(d.owner.plan));
  }, []);

  return (
    <BizPage eyebrow={eyebrow} title={title} lead={lead}>
      {plan === null ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : plan === "free" ? (
        <div className="card space-y-3 ring-1 ring-asa-500/40">
          <p className="font-bold">この機能は有料プラン（月額 3,980 円）でご利用いただけます。</p>
          <p className="text-sm text-slate-600">クーポン・広告・紹介割引で、「行ってみよう」のきっかけを作れます。</p>
          <Link href="/upgrade" className="btn-accent btn-lg">
            有料プランを見る
          </Link>
        </div>
      ) : (
        children
      )}
    </BizPage>
  );
}

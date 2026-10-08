"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

/** 有料プラン限定ページのガード */
export default function PremiumGate({ title, children }: { title: string; children: React.ReactNode }) {
  const [plan, setPlan] = useState<"free" | "premium" | null>(null);
  useEffect(() => {
    api<{ owner: { plan: "free" | "premium" } }>("/api/me").then((d) => setPlan(d.owner.plan));
  }, []);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Link href="/dashboard/business" className="text-sm text-saga-600">
        ← ダッシュボード
      </Link>
      <h1 className="text-xl font-bold">{title}</h1>
      {plan === null ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : plan === "free" ? (
        <div className="card border-amber-300 bg-amber-50">
          <p className="font-semibold">この機能は有料プラン（月額 3,980 円）でご利用いただけます。</p>
          <Link href="/upgrade" className="btn-primary mt-3">
            有料プランにアップグレード
          </Link>
        </div>
      ) : (
        children
      )}
    </main>
  );
}

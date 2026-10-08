"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

type Row = {
  id: number;
  viewed_at: string;
  coupon_used: boolean;
  business_id: number;
  business_name: string;
  category: string;
  coupon_title: string | null;
  discount_rate: number | null;
};

/** 利用履歴（AI 推薦の学習データ） */
export default function HistoryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<"all" | "coupon">("all");

  useEffect(() => {
    api<{ history: Row[] }>("/api/history").then((d) => setRows(d.history));
  }, []);

  const shown = (rows ?? []).filter((r) => filter === "all" || r.coupon_used);
  return (
    <main className="mx-auto max-w-3xl p-4">
      <Link href="/dashboard/customer" className="text-sm text-saga-600">
        ← 地図に戻る
      </Link>
      <h1 className="mt-2 text-xl font-bold">利用履歴</h1>
      <p className="text-xs text-slate-500">閲覧・クーポン利用の履歴をもとに、AI がおすすめを学習します。</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setFilter("all")} className={filter === "all" ? "chip-on" : "chip-off"}>
          すべて
        </button>
        <button onClick={() => setFilter("coupon")} className={filter === "coupon" ? "chip-on" : "chip-off"}>
          クーポン利用
        </button>
      </div>
      {rows === null ? (
        <p className="mt-4 text-sm text-slate-500">読み込み中…</p>
      ) : shown.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">履歴はまだありません。</p>
      ) : (
        <ul className="mt-3 divide-y rounded-2xl border bg-white">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.coupon_used ? "bg-red-50 text-coupon" : "bg-slate-100 text-slate-500"}`}>
                {r.coupon_used ? "利用" : "閲覧"}
              </span>
              <Link href={`/dashboard/customer?shop=${r.business_id}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.business_name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {r.category}
                  {r.coupon_title && `・${r.coupon_title}（${r.discount_rate}% OFF）`}
                </span>
              </Link>
              <time className="shrink-0 text-xs text-slate-500">
                {new Date(r.viewed_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

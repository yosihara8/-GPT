"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import PremiumGate from "@/components/PremiumGate";
import { api } from "@/lib/fetcher";

type Data = {
  monthlyPrice: number;
  standardPrice: number;
  discountPrice: number;
  goal: number;
  total: number;
  discountApplied: boolean;
  stores: { id: number; name: string; count: number; url: string }[];
  customers: { email: string; registered_at: string; business_name: string }[];
};

export default function ReferralsPage() {
  return (
    <PremiumGate title="紹介プログラム">
      <Referrals />
    </PremiumGate>
  );
}

function Referrals() {
  const [data, setData] = useState<Data | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  useEffect(() => {
    api<Data>("/api/referrals").then(setData);
  }, []);
  if (!data) return <p className="text-sm text-slate-500">読み込み中…</p>;

  const pct = Math.min(100, (data.total / data.goal) * 100);
  const remaining = Math.max(0, data.goal - data.total);

  async function copy(id: number, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <p className="text-sm text-slate-600">紹介人数</p>
        <p className="mt-1">
          <span className="text-4xl font-black tabular-nums">現在 {data.total} 名</span>
          <span className="ml-2 text-slate-500">/ 目標 {data.goal} 名</span>
        </p>
        <div
          className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={data.goal}
          aria-valuenow={data.total}
        >
          <div className="h-full rounded-full bg-saga-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${data.discountApplied ? "bg-saga-50 text-saga-700" : "bg-amber-50 text-amber-900"}`}>
          {data.discountApplied ? (
            <>
              🎉 割引適用中：月額 <b>{data.discountPrice.toLocaleString()} 円</b>（通常 {data.standardPrice.toLocaleString()} 円）
            </>
          ) : (
            <>
              あと <b>{remaining} 名</b>の紹介で月額 {data.standardPrice.toLocaleString()} 円 →{" "}
              <b>{data.discountPrice.toLocaleString()} 円</b>（10 名達成で自動適用）
            </>
          )}
        </div>
      </section>

      {data.stores.map((s) => (
        <section key={s.id} className="card flex flex-col items-center gap-4 sm:flex-row">
          <div className="rounded-xl border bg-white p-3">
            <QRCodeSVG value={s.url} size={140} marginSize={1} />
          </div>
          <div className="w-full min-w-0 flex-1">
            <p className="text-sm text-slate-500">{s.name} の紹介リンク（{s.count} 名）</p>
            <p className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm">{s.url}</p>
            <button onClick={() => copy(s.id, s.url)} className="btn-primary mt-2">
              {copied === s.id ? "コピーしました" : "リンクをコピー"}
            </button>
            <p className="mt-2 text-xs text-slate-500">店頭 POP・SNS・ショップカードに QR コードを載せてご活用ください。</p>
          </div>
        </section>
      ))}

      <section className="card">
        <h2 className="font-bold">紹介された顧客</h2>
        {data.customers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">まだ紹介はありません。</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 font-normal">メールアドレス</th>
                <th className="py-1 font-normal">登録日</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="truncate py-2 pr-2">{c.email}</td>
                  <td className="py-2 tabular-nums">{new Date(c.registered_at).toLocaleDateString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

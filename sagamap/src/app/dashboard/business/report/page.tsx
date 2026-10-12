"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Lightbulb, Mail, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "@/lib/fetcher";
import { METRIC_LABELS, monthLabel, prevMonth, type OwnerReport } from "@/lib/owner-report-shared";

const nextMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
};

/** 月次レポート（毎月 1 日にメールでも届く内容を、画面でいつでも見られる） */
export default function ReportPage() {
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<{ report: OwnerReport | null; enabled: boolean; current: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback((m: string | null) => {
    api<{ report: OwnerReport | null; enabled: boolean; current: string }>(`/api/report${m ? `?month=${m}` : ""}`).then((d) => {
      setData(d);
      if (d.report) setMonth(d.report.month);
    });
  }, []);
  useEffect(() => {
    load(null);
  }, [load]);

  if (!data) return <main className="mx-auto max-w-3xl p-4"><div className="h-60 animate-pulse rounded-2xl bg-white" /></main>;
  const r = data.report;
  const isCurrent = month === data.current;

  async function toggle(enabled: boolean) {
    // 押したらすぐ切り替え、保存できなかったら元に戻す
    setData((d) => (d ? { ...d, enabled } : d));
    try {
      await api("/api/report", { method: "POST", body: JSON.stringify({ action: "setting", enabled }) });
      setMsg(enabled ? "毎月 1 日にレポートをお届けします" : "レポートメールを止めました");
    } catch (e) {
      setData((d) => (d ? { ...d, enabled: !enabled } : d));
      setMsg((e as Error).message);
    }
  }
  async function test() {
    setMsg(null);
    try {
      const res = await api<{ to: string }>("/api/report", { method: "POST", body: JSON.stringify({ action: "test", month }) });
      setMsg(`${res.to} に送りました`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Link href="/dashboard/business" className="inline-flex items-center gap-1 text-sm text-slate-600">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        ダッシュボード
      </Link>
      <div>
        <p className="num text-[11px] font-bold tracking-[0.3em] text-saga-600">MONTHLY REPORT</p>
        <h1 className="text-2xl font-bold">月次レポート</h1>
        <p className="text-sm text-slate-600">佐賀観光マップで、お店に来ようとしたお客さまの動きです。毎月 1 日に先月分をメールでもお届けします。</p>
      </div>

      {month && (
        <div className="flex items-center justify-between rounded-2xl bg-white p-2 ring-1 ring-slate-200">
          <button type="button" onClick={() => load(prevMonth(month))} aria-label="前の月" className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="font-bold">
            {monthLabel(month)}
            {isCurrent && <span className="ml-1 text-xs font-normal text-slate-500">（途中経過）</span>}
          </p>
          <button
            type="button"
            onClick={() => load(nextMonth(month))}
            disabled={isCurrent}
            aria-label="次の月"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {r?.stores.map((s) => (
        <section key={s.id} className="card space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-lg font-bold">{s.name}</h2>
            <p className="text-sm text-slate-500">
              充実度 <b className="num text-saga-700">{s.profile}%</b>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {METRIC_LABELS.map(([k, label]) => {
              const c = s.cur[k];
              const p = s.prev[k];
              const d = c - p;
              return (
                <div key={k} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="num text-2xl font-extrabold">{c}</p>
                  <p className={`flex items-center gap-0.5 text-[11px] font-bold ${d > 0 ? "text-tea-700" : d < 0 ? "text-asa-700" : "text-slate-400"}`}>
                    {d > 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : d < 0 ? <TrendingDown className="h-3.5 w-3.5" aria-hidden /> : null}
                    先月比 {d > 0 ? `+${d}` : d}
                  </p>
                </div>
              );
            })}
          </div>
          {s.advice.length > 0 && (
            <div className="rounded-2xl bg-asa-50 p-3">
              <p className="flex items-center gap-1 text-sm font-bold text-asa-700">
                <Lightbulb className="h-4 w-4" aria-hidden />
                次にやること
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {s.advice.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {s.todo.length > 0 && (
            <p className="text-xs text-slate-500">
              お店のページに足りないもの：{s.todo.join("・")}{" "}
              <Link href="/dashboard/business" className="font-bold text-saga-600 underline">
                入力する
              </Link>
            </p>
          )}
        </section>
      ))}

      <section id="settings" className="card space-y-3 scroll-mt-20">
        <h2 className="flex items-center gap-1.5 font-bold">
          <Mail className="h-4 w-4 text-saga-600" aria-hidden />
          レポートメール
        </h2>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">毎月 1 日に、先月のレポートをメールで受け取る</span>
          <input type="checkbox" checked={data.enabled} onChange={(e) => toggle(e.target.checked)} className="h-6 w-6 accent-saga-600" aria-label="レポートメールを受け取る" />
        </label>
        <button type="button" onClick={test} className="btn-outline w-full">
          この月のレポートを自分にメールで送る（お試し）
        </button>
        {msg && <p className="text-sm font-bold text-saga-700">{msg}</p>}
      </section>
    </main>
  );
}

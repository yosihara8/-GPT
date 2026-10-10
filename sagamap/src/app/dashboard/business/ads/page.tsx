"use client";

import { useCallback, useEffect, useState } from "react";
import PremiumGate from "@/components/PremiumGate";
import StoreSelect, { useMyStores } from "@/components/StoreSelect";
import NotifyCheckbox from "@/components/NotifyCheckbox";
import { api } from "@/lib/fetcher";

type Ad = { id: number; headline: string; body: string; ends_at: string; is_active: boolean; business_name: string };

export default function AdsPage() {
  return (
    <PremiumGate title="広告出稿">
      <Ads />
    </PremiumGate>
  );
}

function Ads() {
  const stores = useMyStores();
  const [ads, setAds] = useState<Ad[]>([]);
  const [quota, setQuota] = useState<{ limit: number; used: number; remaining: number } | null>(null);
  const [preview, setPreview] = useState({ headline: "", body: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);
  const load = useCallback(
    () =>
      api<{ ads: Ad[]; limit: number; used: number; remaining: number }>("/api/ads").then((d) => {
        setAds(d.ads);
        setQuota({ limit: d.limit, used: d.used, remaining: d.remaining });
      }),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
      const res = await api<{ notified: number; warnings?: string[] }>("/api/ads", {
        method: "POST",
        body: JSON.stringify({ ...f, notify: f.notify === "on" }),
      });
      setMsgIsError(false);
      setMsg(
        `広告を出稿しました。地図上部のバナー枠に表示されます。${res.notified ? `お客さま ${res.notified} 人のアプリにお知らせしました（メールは毎週金曜にまとめて届きます）` : ""}` +
          (res.warnings?.length ? `\n\n⚠️ 次の点を確認してください（運営者も確認します）：\n・${res.warnings.join("\n・")}` : ""),
      );
      form.reset();
      setPreview({ headline: "", body: "" });
      load();
    } catch (err) {
      setMsgIsError(true);
      setMsg((err as Error).message);
    }
  }

  async function stop(id: number) {
    await api(`/api/ads?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      {quota && (
        <div className={`card flex items-center justify-between ${quota.remaining === 0 ? "border-4 border-sun-400" : ""}`}>
          <div>
            <p className="font-extrabold">📣 広告出稿は月 {quota.limit} 回まで</p>
            <p className="text-xs text-slate-500">毎月 1 日〜末日で数えます。翌月 1 日に回数がリセットされます。</p>
          </div>
          <p className="shrink-0 text-right">
            <span className="text-xs text-slate-500">今月の残り</span>
            <br />
            <b className="text-2xl">{quota.remaining}</b> / {quota.limit} 回
          </p>
        </div>
      )}
      <div>
        <p className="mb-1 text-xs text-slate-500">プレビュー（地図上部に表示されます）</p>
        <div className="flex items-center gap-3 rounded-xl border-2 border-amber-400 bg-white px-3 py-2 shadow">
          <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">PR</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{preview.headline || "見出し"}</span>
            <span className="block truncate text-xs text-slate-600">{preview.body || "本文"}</span>
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card space-y-3">
        <StoreSelect stores={stores} />
        <div>
          <label className="label">見出し（60 文字まで）</label>
          <input name="headline" required maxLength={60} className="input" onChange={(e) => setPreview((p) => ({ ...p, headline: e.target.value }))} />
        </div>
        <div>
          <label className="label">本文（120 文字まで）</label>
          <input name="body" maxLength={120} className="input" onChange={(e) => setPreview((p) => ({ ...p, body: e.target.value }))} />
        </div>
        <div>
          <label className="label">掲載期間</label>
          <select name="days" defaultValue="30" className="input">
            <option value="7">7 日間</option>
            <option value="14">14 日間</option>
            <option value="30">30 日間</option>
          </select>
        </div>
        <NotifyCheckbox />
        {msg && <p className={`whitespace-pre-line text-sm font-bold ${msgIsError ? "text-red-600" : "text-tea-700"}`}>{msg}</p>}
        <p className="text-xs text-slate-500">
          「日本一」「最安」「No.1」など根拠を示せない表現や、効能をうたう表現は自動チェックで掲載できません（景品表示法・医薬品医療機器等法）。
        </p>
        <button disabled={quota?.remaining === 0} className="btn-primary w-full">
          {quota?.remaining === 0 ? "今月の出稿回数を使い切りました" : "出稿する"}
        </button>
      </form>

      <ul className="space-y-2">
        {ads.map((a) => {
          const live = a.is_active && new Date(a.ends_at).getTime() > Date.now();
          return (
            <li key={a.id} className="card flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{a.headline}</span>
                <span className="block text-xs text-slate-500">
                  {a.business_name}・{new Date(a.ends_at).toLocaleDateString("ja-JP")}まで・{live ? "配信中" : "停止"}
                </span>
              </span>
              {live && (
                <button onClick={() => stop(a.id)} className="btn-outline px-3 py-1.5">
                  停止
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

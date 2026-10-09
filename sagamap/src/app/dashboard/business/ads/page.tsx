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
  const [preview, setPreview] = useState({ headline: "", body: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => api<{ ads: Ad[] }>("/api/ads").then((d) => setAds(d.ads)), []);
  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
      const res = await api<{ notified: number; emailed: number }>("/api/ads", {
        method: "POST",
        body: JSON.stringify({ ...f, notify: f.notify === "on" }),
      });
      setMsg(`広告を出稿しました。地図上部のバナー枠に表示されます。${res.notified ? `お客さま ${res.notified} 人にお知らせしました（メール ${res.emailed} 通）` : ""}`);
      form.reset();
      setPreview({ headline: "", body: "" });
      load();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function stop(id: number) {
    await api(`/api/ads?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
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
        {msg && <p className="text-sm font-bold text-tea-700">{msg}</p>}
        <button className="btn-primary w-full">出稿する</button>
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

"use client";

import { useCallback, useEffect, useState } from "react";
import PremiumGate from "@/components/PremiumGate";
import StoreSelect, { useMyStores } from "@/components/StoreSelect";
import NotifyCheckbox from "@/components/NotifyCheckbox";
import { api } from "@/lib/fetcher";

type Coupon = {
  id: number;
  title: string;
  discount_rate: number;
  conditions: string;
  expires_at: string;
  business_name: string;
  used_count: number;
};

export default function CouponsPage() {
  return (
    <PremiumGate title="クーポン発行">
      <Coupons />
    </PremiumGate>
  );
}

function Coupons() {
  const stores = useMyStores();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => api<{ coupons: Coupon[] }>("/api/coupons").then((d) => setCoupons(d.coupons)), []);
  useEffect(() => {
    load();
  }, [load]);

  const defaultExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    try {
      const res = await api<{ notified: number; emailed: number }>("/api/coupons", {
        method: "POST",
        body: JSON.stringify({ ...f, notify: f.notify === "on", expiresAt: `${f.expiresAt}T23:59:59+09:00` }),
      });
      setMsg(`クーポンを発行しました。${res.notified ? `興味のありそうなお客さま ${res.notified} 人にお知らせしました（メール ${res.emailed} 通）` : ""}`);
      form.reset();
      load();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="card space-y-3">
        <StoreSelect stores={stores} />
        <div>
          <label className="label">タイトル</label>
          <input name="title" required className="input" placeholder="ランチ 10% OFF" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">割引率（%）</label>
            <input name="discountRate" type="number" min={1} max={100} defaultValue={10} required className="input" />
          </div>
          <div>
            <label className="label">有効期限</label>
            <input name="expiresAt" type="date" defaultValue={defaultExpiry} required className="input" />
          </div>
        </div>
        <div>
          <label className="label">利用条件</label>
          <input name="conditions" className="input" placeholder="平日 11:00-14:00、1 会計 1 回まで" />
        </div>
        <NotifyCheckbox />
        {msg && <p className="text-sm font-bold text-tea-700">{msg}</p>}
        <button className="btn-primary w-full">発行する</button>
      </form>

      <ul className="space-y-2">
        {coupons.map((c) => {
          const expired = new Date(c.expires_at).getTime() < Date.now();
          return (
            <li key={c.id} className={`card flex items-center gap-3 ${expired ? "opacity-50" : ""}`}>
              <span className="w-14 shrink-0 text-xl font-black text-coupon">{c.discount_rate}%</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.title}</span>
                <span className="block truncate text-xs text-slate-500">
                  {c.business_name}・{new Date(c.expires_at).toLocaleDateString("ja-JP")}まで{expired && "（期限切れ）"}
                  {c.conditions && `・${c.conditions}`}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-slate-500">
                利用
                <br />
                <b className="text-base text-slate-900">{c.used_count}</b> 回
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView, { type HeatPoint, type MapShop } from "@/components/MapView";
import HourlyChart from "@/components/HourlyChart";
import PhotoUploader from "@/components/PhotoUploader";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { api } from "@/lib/fetcher";
import { CATEGORIES, PRICE_STANDARD } from "@/lib/config";

type Owner = { id: number; name: string; email: string; plan: "free" | "premium"; monthly_price: number };
type Store = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  service_description: string;
  contact: string;
  price_level: number;
  crowd_level: number;
  instagram_url: string | null;
  twitter_url: string | null;
  has_photo: boolean;
  photo_version: number | null;
};
type Stats = {
  stores: { id: number; name: string; view_count: number; coupon_uses: number; views_7d: number }[];
  insights: { businessId: number; area: string; hourly: number[]; peakHours: number[]; advice: string }[];
  areaRanking: { area: string; value: number }[][];
};

export default function BusinessDashboardPage() {
  return (
    <Suspense>
      <BusinessDashboard />
    </Suspense>
  );
}

function BusinessDashboard() {
  const params = useSearchParams();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [heatMode, setHeatMode] = useState<"density" | "flow">("flow");
  const [hour, setHour] = useState(() => new Date().getHours());
  const [heat, setHeat] = useState<HeatPoint[]>([]);
  const [allShops, setAllShops] = useState<MapShop[]>([]);

  const load = useCallback(async () => {
    const me = await api<{ owner: Owner; stores: Store[] }>("/api/me");
    setOwner(me.owner);
    setStores(me.stores);
    setStoreId((id) => id ?? me.stores[0]?.id ?? null);
    setStats(await api<Stats>("/api/stats"));
  }, []);
  useEffect(() => {
    load();
    fetch("/api/businesses").then((r) => r.json()).then((d) => setAllShops(d.businesses ?? []));
  }, [load]);

  useEffect(() => {
    const url = heatMode === "flow" ? `/api/heatmap?type=flow&hour=${hour}` : "/api/heatmap?type=density";
    api<{ points: HeatPoint[] }>(url).then((d) => setHeat(d.points));
  }, [heatMode, hour]);

  const store = stores.find((s) => s.id === storeId) ?? null;
  const storeStats = stats?.stores.find((s) => s.id === storeId);
  const insight = stats?.insights.find((i) => i.businessId === storeId);
  const premium = owner?.plan === "premium";
  const center = useMemo(() => (store ? { lat: store.lat, lng: store.lng } : null), [store]);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <VerifyEmailBanner />
      {params.get("welcome") && (
        <p className="rounded-lg bg-saga-50 px-4 py-3 text-sm text-saga-700">ご登録ありがとうございます！店舗が地図に掲載されました。</p>
      )}
      {params.get("upgraded") && (
        <p className="rounded-lg bg-saga-50 px-4 py-3 text-sm text-saga-700">
          有料プランへのお申し込みありがとうございます。反映まで数秒かかる場合があります。
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">事業主ダッシュボード</h1>
          <p className="text-sm text-slate-500">{owner?.email}</p>
        </div>
        {stores.length > 1 && (
          <select value={storeId ?? ""} onChange={(e) => setStoreId(Number(e.target.value))} className="input w-auto">
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* プラン */}
      <div className={`card flex flex-wrap items-center justify-between gap-3 ${premium ? "" : "border-amber-300 bg-amber-50"}`}>
        <div>
          <p className="text-sm text-slate-600">現在のプラン</p>
          <p className="text-lg font-bold">
            {premium ? `有料プラン（月額 ${owner!.monthly_price.toLocaleString()} 円）` : "無料プラン"}
          </p>
          {!premium && (
            <p className="text-sm text-slate-600">
              月額 {PRICE_STANDARD.toLocaleString()} 円でクーポン発行・広告出稿・SNS 連携・紹介割引が使えます。
            </p>
          )}
        </div>
        <Link href="/upgrade" className={premium ? "btn-outline" : "btn-primary"}>
          {premium ? "プラン・お支払い管理" : "有料プランにアップグレード"}
        </Link>
      </div>

      {/* 基本統計 */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="累計閲覧数" value={storeStats?.view_count} />
        <StatTile label="直近 7 日の閲覧" value={storeStats?.views_7d} />
        <StatTile label="クーポン利用数" value={storeStats?.coupon_uses} />
      </div>

      {/* 有料機能 */}
      <div className="grid grid-cols-3 gap-3">
        <FeatureLink href="/dashboard/business/coupons" label="クーポン発行" locked={!premium} />
        <FeatureLink href="/dashboard/business/ads" label="広告出稿" locked={!premium} />
        <FeatureLink href="/dashboard/business/referrals" label="紹介プログラム" locked={!premium} />
      </div>

      {/* いつ・どこで集客すべきか */}
      <section className="card space-y-4">
        <h2 className="font-bold">いつ・どこで集客すべきか</h2>
        {insight && (
          <>
            <HourlyChart
              title={`${insight.area}の時間帯別の観光客（ダミーデータ）`}
              values={insight.hourly}
              peakHours={insight.peakHours}
              selectedHour={heatMode === "flow" ? hour : undefined}
              onSelectHour={(h) => {
                setHeatMode("flow");
                setHour(h);
              }}
            />
            <p className="rounded-lg bg-saga-50 px-3 py-2 text-sm text-saga-900">{insight.advice}</p>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setHeatMode("flow")} className={heatMode === "flow" ? "chip-on" : "chip-off"}>
            観光客の流れ
          </button>
          <button onClick={() => setHeatMode("density")} className={heatMode === "density" ? "chip-on" : "chip-off"}>
            事業主の密度
          </button>
          {heatMode === "flow" && (
            <label className="flex flex-1 items-center gap-2 text-sm text-slate-600">
              <span className="shrink-0 tabular-nums">{hour}時台</span>
              <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="w-full accent-saga-600" />
            </label>
          )}
        </div>
        <MapView shops={allShops} me={center} heatmap={heat} selectedId={storeId} className="h-[50vh] overflow-hidden rounded-xl" />
        {heatMode === "flow" && stats && (
          <p className="text-sm text-slate-600">
            {hour}時台に人が多いエリア：
            {stats.areaRanking[hour].map((a, i) => (
              <span key={a.area} className="ml-1 font-medium text-slate-900">
                {i + 1}. {a.area}
              </span>
            ))}
          </p>
        )}
      </section>

      {store && <PhotoUploader key={`photo-${store.id}`} shop={store} onChanged={load} />}
      {store && <StoreEditor key={store.id} store={store} premium={premium} onSaved={load} />}

      {premium && <AddStore onAdded={load} />}

      <PasswordChangeForm />
    </main>
  );
}

function StatTile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value?.toLocaleString() ?? "—"}</p>
    </div>
  );
}

function FeatureLink({ href, label, locked }: { href: string; label: string; locked: boolean }) {
  return (
    <Link href={locked ? "/upgrade" : href} className="card flex flex-col items-center gap-1 py-3 text-center text-sm font-semibold">
      <span>{label}</span>
      {locked && <span className="text-[10px] font-normal text-amber-700">有料プラン</span>}
    </Link>
  );
}

function StoreEditor({ store, premium, onSaved }: { store: Store; premium: boolean; onSaved: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const body: Record<string, unknown> = {
      name: f.name,
      address: f.address,
      category: f.category,
      serviceDescription: f.serviceDescription,
      contact: f.contact,
      priceLevel: f.priceLevel,
      crowdLevel: f.crowdLevel,
    };
    // 住所を変えた場合は緯度経度を送らず、サーバー側で再ジオコーディングする
    if (f.address === store.address) {
      body.lat = f.lat;
      body.lng = f.lng;
    }
    if (premium) {
      body.instagramUrl = f.instagramUrl;
      body.twitterUrl = f.twitterUrl;
    }
    try {
      await api(`/api/businesses/${store.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setMsg("保存しました");
      onSaved();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-bold">店舗情報の編集</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="店舗名" name="name" defaultValue={store.name} required />
        <div>
          <label className="label">業種</label>
          <select name="category" defaultValue={store.category} className="input">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <Input label="住所" name="address" defaultValue={store.address} required className="sm:col-span-2" />
        <Input label="緯度" name="lat" defaultValue={String(store.lat)} inputMode="decimal" />
        <Input label="経度" name="lng" defaultValue={String(store.lng)} inputMode="decimal" />
        <div className="sm:col-span-2">
          <label className="label">サービス内容</label>
          <textarea name="serviceDescription" defaultValue={store.service_description} rows={3} className="input" />
        </div>
        <Input label="連絡先" name="contact" defaultValue={store.contact} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">価格帯</label>
            <select name="priceLevel" defaultValue={store.price_level} className="input">
              <option value="1">¥</option>
              <option value="2">¥¥</option>
              <option value="3">¥¥¥</option>
            </select>
          </div>
          <div>
            <label className="label">普段の混雑度</label>
            <select name="crowdLevel" defaultValue={store.crowd_level} className="input">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <fieldset disabled={!premium} className="space-y-3 rounded-xl border border-slate-200 p-3 disabled:opacity-60">
        <legend className="px-1 text-sm font-semibold">
          SNS 連携 {!premium && <span className="text-xs font-normal text-amber-700">（有料プラン）</span>}
        </legend>
        <Input label="Instagram の URL" name="instagramUrl" type="url" defaultValue={store.instagram_url ?? ""} placeholder="https://instagram.com/…" />
        <Input label="X（Twitter）の URL" name="twitterUrl" type="url" defaultValue={store.twitter_url ?? ""} placeholder="https://x.com/…" />
      </fieldset>

      {msg && <p className="text-sm text-saga-700">{msg}</p>}
      <button disabled={saving} className="btn-primary">
        {saving ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}

function AddStore({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline w-full">
        ＋ 店舗を追加（有料プラン）
      </button>
    );
  }
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      await api("/api/businesses", {
        method: "POST",
        body: JSON.stringify({
          name: f.name,
          address: f.address,
          category: f.category,
          serviceDescription: f.serviceDescription,
          contact: f.contact,
          ...(f.lat && f.lng ? { lat: f.lat, lng: f.lng } : {}),
        }),
      });
      setOpen(false);
      onAdded();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-bold">店舗を追加</h2>
      <Input label="店舗名" name="name" required />
      <Input label="住所" name="address" required />
      <div className="grid grid-cols-2 gap-2">
        <Input label="緯度（任意）" name="lat" inputMode="decimal" />
        <Input label="経度（任意）" name="lng" inputMode="decimal" />
      </div>
      <div>
        <label className="label">業種</label>
        <select name="category" className="input">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <Input label="サービス内容" name="serviceDescription" />
      <Input label="連絡先" name="contact" />
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <div className="flex gap-2">
        <button className="btn-primary">追加する</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline">
          キャンセル
        </button>
      </div>
    </form>
  );
}

function Input({ label, className = "", ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="label" htmlFor={props.name}>
        {label}
      </label>
      <input id={props.name} className="input" {...props} />
    </div>
  );
}

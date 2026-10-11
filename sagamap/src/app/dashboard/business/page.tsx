"use client";

import Link from "next/link";
import { Check, ChevronDown, Lock } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView, { type HeatPoint, type MapShop } from "@/components/MapView";
import HourlyChart from "@/components/HourlyChart";
import PhotoUploader from "@/components/PhotoUploader";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import CouponRow from "@/components/CouponRow";
import { AdDetail } from "@/components/AdBanner";
import { api } from "@/lib/fetcher";
import { CATEGORIES, PRICE_OPTIONS, PRICE_STANDARD } from "@/lib/config";

type Owner = { id: number; name: string; email: string; plan: "free" | "premium"; complimentary?: boolean; monthly_price: number };
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
  insights: {
    businessId: number;
    area: string;
    hourly: number[];
    peakHours: number[];
    advice: string;
    total: number;
    collecting: boolean;
  }[];
  areaRanking: { area: string; value: number }[][];
  days: number;
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

      {/* プラン（普段は 1 行に短縮。タップで無料・有料の全文を表示） */}
      <details className="group card p-0">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-xs text-slate-500">現在のプラン</span>
            <span className="block truncate font-semibold">
              {premium ? (owner?.complimentary ? "有料プラン（特別招待）" : "有料プラン") : "無料プラン"}
              <span className="ml-2 text-sm font-normal text-slate-500">
                {premium
                  ? owner?.complimentary
                    ? "お支払い不要"
                    : `月額 ${owner!.monthly_price.toLocaleString()} 円（税込）`
                  : "0 円"}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-saga-600">
            <span className="group-open:hidden">詳しく見る</span>
            <span className="hidden group-open:inline">閉じる</span>
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden />
          </span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <PlanCard
              current={!premium}
              title="無料プラン"
              price="0 円"
              tone="tea"
              features={["店舗の掲載（1 店舗）", "店舗写真・基本情報の表示", "閲覧数・クーポン利用数の確認", "いつ・どこで集客すべきかの分析"]}
            />
            <PlanCard
              current={premium}
              title={owner?.complimentary ? "有料プラン（特別招待）" : "有料プラン"}
              price={owner?.complimentary ? "0 円（特別招待・お支払い不要）" : `月額 ${(premium ? owner!.monthly_price : PRICE_STANDARD).toLocaleString()} 円（税込）`}
              tone="coral"
              features={["クーポン発行", "広告出稿（月 2 回まで）", "SNS 連携（Instagram・X）", "紹介割引（月 10 名で翌月 2,980 円）", "複数店舗の登録"]}
            />
          </div>
          {!owner?.complimentary && (
            <Link href="/upgrade" className={premium ? "btn-outline w-full" : "btn-primary w-full"}>
              {premium ? "プラン・お支払いの管理" : "有料プランにアップグレードする"}
            </Link>
          )}
        </div>
      </details>

      {/* 基本統計 */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="累計閲覧数" value={storeStats?.view_count} />
        <StatTile label="直近 7 日の閲覧" value={storeStats?.views_7d} />
        <StatTile label="クーポン利用数" value={storeStats?.coupon_uses} />
      </div>

      {/* 有料機能 */}
      <div className="grid grid-cols-3 gap-3">
        <FeatureLink href="/dashboard/business/coupons" label="クーポン発行" locked={!premium} />
        <FeatureLink href="/dashboard/business/ads" label="広告出稿（月2回）" locked={!premium} />
        <FeatureLink href="/dashboard/business/referrals" label="紹介プログラム" locked={!premium} />
      </div>

      {/* いま出しているクーポン・広告 */}
      {premium && <RunningPromotions />}

      {/* いつ・どこで集客すべきか */}
      <section className="card space-y-4">
        <h2 className="font-bold">いつ・どこで集客すべきか</h2>
        {insight && (
          <>
            <HourlyChart
              title={`${insight.area}・お店の周辺 1km の時間帯別の利用者数（実測・直近 ${stats?.days ?? 30} 日）`}
              values={insight.hourly}
              peakHours={insight.peakHours}
              selectedHour={heatMode === "flow" ? hour : undefined}
              onSelectHour={(h) => {
                setHeatMode("flow");
                setHour(h);
              }}
            />
            <p className={`rounded-lg px-3 py-2 text-sm ${insight.collecting ? "bg-sun-100 text-amber-900" : "bg-saga-50 text-saga-900"}`}>
              {insight.advice}
            </p>
            <p className="text-xs text-slate-500">
              ※ 佐賀観光マップの利用者が地図を開いた場所・時刻（匿名）と、お店のページの閲覧数を集計した実測値です。
            </p>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setHeatMode("flow")} className={heatMode === "flow" ? "chip-on" : "chip-off"}>
            利用者の流れ（実測）
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
            {stats.areaRanking[hour].length === 0 && <span className="ml-1">まだデータがありません</span>}
            {stats.areaRanking[hour].map((a, i) => (
              <span key={a.area} className="ml-1 font-medium text-slate-900">
                {i + 1}. {a.area}（{a.value} 件）
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

function PlanCard(props: { current: boolean; title: string; price: string; features: string[]; tone: "tea" | "coral" }) {
  return (
    <div className={`card relative ${props.current ? "border-saga-600 ring-1 ring-saga-600" : "opacity-70"}`}>
      {props.current && (
        <span className="absolute -top-2.5 left-4 rounded-md bg-saga-600 px-2 py-0.5 text-[11px] font-semibold text-white">ご利用中</span>
      )}
      <p className="mt-1 text-base font-semibold text-slate-700">{props.title}</p>
      <p className="text-2xl font-bold tracking-tight">{props.price}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {props.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            {props.current ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-saga-600" aria-hidden />
            ) : props.tone === "coral" ? (
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            ) : (
              <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-slate-400">・</span>
            )}
            {f}
          </li>
        ))}
      </ul>
    </div>
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
    <Link href={locked ? "/upgrade" : href} className="card flex flex-col items-center gap-1.5 py-3 text-center text-sm font-semibold hover:bg-slate-50">
      <span>{label}</span>
      {locked ? (
        <span className="text-[10px] font-normal text-amber-700">有料プラン</span>
      ) : (
        <span className="rounded bg-saga-50 px-1.5 py-px text-[10px] font-semibold text-saga-700 ring-1 ring-saga-100">有料プラン中</span>
      )}
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
    if (premium) {
      body.instagramUrl = f.instagramUrl;
      body.twitterUrl = f.twitterUrl;
    }
    try {
      const res = await api<{ matched?: string }>(`/api/businesses/${store.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setMsg(res.matched ? `保存しました。地図の場所を「${res.matched}」に更新しました` : "保存しました");
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
        <div className="sm:col-span-2">
          <Input label="住所" name="address" defaultValue={store.address} required />
          <p className="mt-1 text-xs text-slate-500">住所を変更すると、地図の場所も自動で更新されます。</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">サービス内容</label>
          <textarea name="serviceDescription" defaultValue={store.service_description} rows={3} className="input" />
        </div>
        <Input label="連絡先" name="contact" defaultValue={store.contact} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">価格帯</label>
            <select name="priceLevel" defaultValue={store.price_level} className="input">
              {PRICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
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
      <Input label="住所" name="address" required placeholder="佐賀県佐賀市駅前中央1丁目4-17" />
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

type MyCoupon = {
  id: number;
  title: string;
  discount_rate: number;
  conditions: string;
  expires_at: string;
  is_active: boolean;
  business_name: string;
  used_count: number;
  has_image?: boolean;
};
type MyAd = { id: number; headline: string; body: string; ends_at: string; is_active: boolean; business_name: string; has_image?: boolean };

/** タップで開く項目（画面を変えずに内容を表示） */
function Expandable({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-slate-100 p-3">{children}</div>
    </details>
  );
}

/** 配信中のクーポン・広告の一覧（タップで内容を表示） */
function RunningPromotions() {
  const [coupons, setCoupons] = useState<MyCoupon[] | null>(null);
  const [ads, setAds] = useState<MyAd[] | null>(null);
  useEffect(() => {
    api<{ coupons: MyCoupon[] }>("/api/coupons").then((d) => setCoupons(d.coupons));
    api<{ ads: MyAd[] }>("/api/ads").then((d) => setAds(d.ads));
  }, []);
  const now = Date.now();
  const liveCoupons = (coupons ?? []).filter((c) => c.is_active && new Date(c.expires_at).getTime() > now);
  const liveAds = (ads ?? []).filter((a) => a.is_active && new Date(a.ends_at).getTime() > now);
  const until = (d: string) => `${new Date(d).toLocaleDateString("ja-JP")} まで`;

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-bold">いま配信中のクーポン・広告</h2>
        <p className="text-xs text-slate-500">タップすると、お客さまに見えている内容を表示します。</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">クーポン（{liveCoupons.length} 件）</h3>
          <Link href="/dashboard/business/coupons" className="text-xs font-medium text-saga-600">
            クーポンを発行する
          </Link>
        </div>
        {coupons && liveCoupons.length === 0 && <p className="text-sm text-slate-500">配信中のクーポンはありません。</p>}
        {liveCoupons.map((c) => (
          <Expandable
            key={c.id}
            summary={
              <>
                <span className="w-12 shrink-0 text-xl font-bold tabular-nums text-coupon">{c.discount_rate}%</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.title}</span>
                  <span className="block text-xs text-slate-500">
                    {until(c.expires_at)}・利用 {c.used_count} 回
                  </span>
                </span>
              </>
            }
          >
            <p className="text-xs text-slate-500">{c.business_name}</p>
            <CouponRow coupon={c} />
          </Expandable>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">広告（{liveAds.length} 件）</h3>
          <Link href="/dashboard/business/ads" className="text-xs font-medium text-saga-600">
            広告を出稿する
          </Link>
        </div>
        {ads && liveAds.length === 0 && <p className="text-sm text-slate-500">配信中の広告はありません。</p>}
        {liveAds.map((a) => (
          <Expandable
            key={a.id}
            summary={
              <>
                <span className="shrink-0 rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.headline}</span>
                  <span className="block text-xs text-slate-500">{until(a.ends_at)}</span>
                </span>
              </>
            }
          >
            <p className="mb-2 text-xs text-slate-500">{a.business_name}</p>
            <AdDetail ad={{ ...a, business_id: 0 }} />
          </Expandable>
        ))}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, FileBarChart, Megaphone, QrCode, Store, TicketPercent, Users } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView, { type HeatPoint, type MapShop } from "@/components/MapView";
import HourlyChart from "@/components/HourlyChart";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import CouponRow from "@/components/CouponRow";
import { AdDetail } from "@/components/AdBanner";
import AdStats from "@/components/AdStats";
import { api } from "@/lib/fetcher";
import { couponShort, type CouponValue } from "@/lib/coupon";
import { profileChecklist, profilePercent } from "@/lib/profile";
import BizPage, { StorePicker } from "@/components/business/BizPage";
import { useOwnerData } from "@/components/business/useOwnerData";

type Stats = {
  stores: { id: number; name: string; view_count: number; coupon_uses: number; views_7d: number; route_30d?: number; call_30d?: number; save_30d?: number; coupon_view_30d?: number; qr_scan_30d?: number }[];
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
  const { owner, stores, store, storeId, setStoreId, premium } = useOwnerData();
  const [stats, setStats] = useState<Stats | null>(null);
  const [heatMode, setHeatMode] = useState<"density" | "flow">("flow");
  const [hour, setHour] = useState(() => new Date().getHours());
  const [heat, setHeat] = useState<HeatPoint[]>([]);
  const [allShops, setAllShops] = useState<MapShop[]>([]);

  useEffect(() => {
    api<Stats>("/api/stats").then(setStats).catch(() => setStats(null));
    fetch("/api/businesses").then((r) => r.json()).then((d) => setAllShops(d.businesses ?? []));
  }, []);
  useEffect(() => {
    const url = heatMode === "flow" ? `/api/heatmap?type=flow&hour=${hour}` : "/api/heatmap?type=density";
    api<{ points: HeatPoint[] }>(url).then((d) => setHeat(d.points));
  }, [heatMode, hour]);

  const storeStats = stats?.stores.find((s) => s.id === storeId);
  const insight = stats?.insights.find((i) => i.businessId === storeId);
  const center = useMemo(() => (store ? { lat: store.lat, lng: store.lng } : null), [store]);
  const score = store ? profilePercent(profileChecklist(store, premium)) : null;

  const actions: { href: string; label: string; sub: string; icon: typeof Store; locked?: boolean; accent?: boolean }[] = [
    { href: "/dashboard/business/store", label: "お店の情報", sub: score != null ? `充実度 ${score}%` : "写真・営業時間・メニュー", icon: Store, accent: score != null && score < 100 },
    { href: "/dashboard/business/coupons", label: "クーポン", sub: "来店のきっかけに", icon: TicketPercent, locked: !premium },
    { href: "/dashboard/business/ads", label: "広告", sub: "地図の PR 枠", icon: Megaphone, locked: !premium },
    { href: "/dashboard/business/poster", label: "QR ポスター", sub: "レジ横に置くだけ", icon: QrCode },
    { href: "/dashboard/business/referrals", label: "紹介", sub: "10 名で翌月割引", icon: Users, locked: !premium },
    { href: "/dashboard/business/report", label: "月次レポート", sub: "先月と比べる", icon: FileBarChart },
  ];

  return (
    <BizPage
      eyebrow="BUSINESS"
      title="事業主ダッシュボード"
      lead={store?.name ?? owner?.email}
      overlap
      aside={<StorePicker stores={stores} value={storeId} onChange={setStoreId} />}
    >
      {/* 基本の数字（帯の上に重ねる） */}
      <div className="relative !-mt-14 grid grid-cols-3 gap-2 px-1 sm:gap-3 sm:px-3">
        <StatTile label="累計閲覧数" value={storeStats?.view_count} />
        <StatTile label="直近 7 日の閲覧" value={storeStats?.views_7d} />
        <StatTile label="クーポン利用数" value={storeStats?.coupon_uses} />
      </div>

      <VerifyEmailBanner />
      {params.get("welcome") && (
        <p className="rounded-2xl bg-tea-50 px-4 py-3 text-sm font-bold text-tea-700">ご登録ありがとうございます！店舗が地図に掲載されました。まずは「お店の情報」で写真と営業時間を入れましょう。</p>
      )}
      {params.get("upgraded") && (
        <p className="rounded-2xl bg-tea-50 px-4 py-3 text-sm font-bold text-tea-700">有料プランへのお申し込みありがとうございます。反映まで数秒かかる場合があります。</p>
      )}

      {/* お客さまの行動（来店につながる動き。直近 30 日） */}
      <section className="card">
        <h2 className="font-bold">お店に来ようとしたお客さま（直近 30 日）</h2>
        <p className="text-xs text-slate-500">佐賀観光マップでお客さまが押したボタンの数です（同じ人の同じ操作は 1 時間に 1 回まで数えます）。</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <MiniStat label="経路を調べた" value={storeStats?.route_30d} />
          <MiniStat label="電話をかけた" value={storeStats?.call_30d} />
          <MiniStat label="お気に入りに保存" value={storeStats?.save_30d} />
          <MiniStat label="クーポンを見た" value={storeStats?.coupon_view_30d} />
          <div className="col-span-2 sm:col-span-1">
            <MiniStat label="QR ポスターから来た" value={storeStats?.qr_scan_30d} />
          </div>
        </div>
      </section>

      {/* やること（よく使う画面へ 1 タップ） */}
      <section aria-label="メニュー" className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.locked ? "/dashboard/business/settings#plan" : a.href}
            className={`card flex items-center gap-3 p-3 transition hover:bg-slate-50 ${a.accent ? "ring-2 ring-asa-500/40" : ""}`}
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${a.accent ? "bg-asa-50 text-asa-600" : "bg-saga-50 text-saga-600"}`}>
              <a.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{a.label}</span>
              <span className={`block truncate text-[11px] ${a.locked ? "font-bold text-sun-500" : a.accent ? "font-bold text-asa-600" : "text-slate-500"}`}>
                {a.locked ? "有料プランの機能" : a.sub}
              </span>
            </span>
          </Link>
        ))}
      </section>

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
            <p className={`rounded-xl px-3 py-2 text-sm ${insight.collecting ? "bg-sun-100 text-amber-900" : "bg-saga-50 text-saga-900"}`}>{insight.advice}</p>
            <p className="text-xs text-slate-500">※ 佐賀観光マップの利用者が地図を開いた場所・時刻（匿名）と、お店のページの閲覧数を集計した実測値です。</p>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setHeatMode("flow")} className={heatMode === "flow" ? "chip-on" : "chip-off"}>
            利用者の流れ（実測）
          </button>
          <button onClick={() => setHeatMode("density")} className={heatMode === "density" ? "chip-on" : "chip-off"}>
            事業主の密度
          </button>
        </div>
        {heatMode === "flow" && (
          <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span className="num w-12 shrink-0 font-bold text-slate-800">{hour}時台</span>
            <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="min-w-0 flex-1 accent-saga-600" aria-label="時間帯" />
          </label>
        )}
        <MapView shops={allShops} me={center} heatmap={heat} selectedId={storeId} legend layerToggle={false} className="h-[50vh] overflow-hidden rounded-xl" />
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

      {/* プラン（1 行。詳しくは設定） */}
      <Link href="/dashboard/business/settings#plan" className="card flex items-center justify-between gap-3 hover:bg-slate-50">
        <span className="min-w-0">
          <span className="block text-xs text-slate-500">現在のプラン</span>
          <span className="block truncate font-bold">
            {premium ? (owner?.complimentary ? "特別招待プラン" : "有料プラン") : "無料プラン"}
            <span className="ml-2 text-sm font-normal text-slate-500">
              {premium ? (owner?.complimentary ? "お支払い不要" : `月額 ${owner?.monthly_price.toLocaleString()} 円（税込）`) : "0 円"}
            </span>
          </span>
          {premium && owner?.plan_ends_at && (
            <span className="mt-0.5 block text-xs font-bold text-coupon">{new Date(owner.plan_ends_at).toLocaleDateString("ja-JP")}まで有料プランを使えます</span>
          )}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </Link>
    </BizPage>
  );
}

function StatTile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="card px-3 py-3 sm:px-4">
      <p className="text-[11px] font-bold text-slate-500 sm:text-xs">{label}</p>
      <p className="num mt-1 text-[28px] font-extrabold leading-none text-slate-900 sm:text-4xl">{value?.toLocaleString() ?? "—"}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl bg-saga-50 px-3 py-2.5">
      <p className="num text-2xl font-extrabold leading-none text-saga-700">{value?.toLocaleString() ?? "—"}</p>
      <p className="mt-1 text-[11px] font-bold text-slate-600">{label}</p>
    </div>
  );
}

type MyCoupon = CouponValue & {
  id: number;
  title: string;
  conditions: string;
  expires_at: string;
  is_active: boolean;
  business_name: string;
  used_count: number;
  has_image?: boolean;
};
type MyAd = {
  id: number;
  headline: string;
  body: string;
  ends_at: string;
  is_active: boolean;
  business_name: string;
  has_image?: boolean;
  view_count?: number;
  click_count?: number;
  viewer_count?: number;
  tapper_count?: number;
  visitor_count?: number;
};

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
        <p className="text-xs text-slate-500">タップすると開きます。お客さまに見えている内容と、広告の効果（見た人・タップした人・お店に行こうとした人）を確認できます。</p>
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
                <span className="num w-16 shrink-0 text-base font-extrabold text-coupon">{couponShort(c)}</span>
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
                  <AdStats ad={a} compact />
                </span>
              </>
            }
          >
            <p className="mb-2 text-xs text-slate-500">{a.business_name}</p>
            <AdStats ad={a} />
            <div className="mt-2">
              <AdDetail ad={{ ...a, business_id: 0 }} />
            </div>
            <Link href="/dashboard/business/ads#results" className="mt-2 inline-block text-xs font-medium text-saga-600">
              広告の内容を修正する
            </Link>
          </Expandable>
        ))}
        {ads && ads.length > liveAds.length && (
          <Link href="/dashboard/business/ads#results" className="block text-right text-xs font-medium text-saga-600">
            終了した広告の効果も見る →
          </Link>
        )}
      </div>
    </section>
  );
}

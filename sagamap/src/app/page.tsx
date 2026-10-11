"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import MapView, { isHighlighted, type MapShop, type MapSpot } from "@/components/MapView";
import AdBanner, { AdDetail, type Ad } from "@/components/AdBanner";
import { scrollToElement } from "@/lib/scroll";
import ShopPhoto from "@/components/ShopPhoto";
import LocationAccuracy from "@/components/LocationAccuracy";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CATEGORIES, COUPON_HIGHLIGHT_RADIUS_M } from "@/lib/config";
import CategoryIcon from "@/components/CategoryIcon";
import { ChevronRight, LayoutGrid, LocateFixed, Luggage, Store, Ticket } from "lucide-react";
import { formatDistance, haversineMeters } from "@/lib/geo";

type Shop = MapShop & { address: string; service_description: string; has_photo?: boolean };
type Coupon = { id: number; title: string; discount_rate: number; conditions: string; expires_at: string };

/** トップ: 店舗一覧の地図（会員登録なしで閲覧できる集客の入り口） */
export default function HomePage() {
  const { data: session } = useSession();
  const { position, accuracy, isFallback, status, locate } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // 地図のピン・広告をタップしたら、お店の内容（クーポン含む）まで移動する
  const openShop = useCallback((id: number, ad: Ad | null = null) => {
    setSelectedAd(ad);
    setSelectedId(id);
    setTimeout(() => scrollToElement("shop-card", "home-panel"), 80);
  }, []);
  useEffect(() => {
    setCoupons([]);
    if (!selectedId) return;
    fetch(`/api/businesses/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setCoupons(d.coupons ?? []))
      .catch(() => setCoupons([]));
  }, [selectedId]);

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => setShops(d.businesses ?? []));
    fetch("/api/spots").then((r) => r.json()).then((d) => setSpots(d.spots ?? []));
  }, []);

  // 人の流れの実測のため、地図を開いた場所を匿名で記録（約 100m 単位）
  const pinged = useRef(false);
  useEffect(() => {
    if (pinged.current || status !== "ok" || !position || (accuracy ?? Infinity) > 300) return;
    pinged.current = true;
    fetch("/api/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(position) }).catch(
      () => undefined,
    );
  }, [status, position, accuracy]);

  const visible = useMemo(() => (category ? shops.filter((s) => s.category === category) : shops), [shops, category]);
  const nearbyCoupons = useMemo(
    () => visible.filter((s) => isHighlighted(s, position, COUPON_HIGHLIGHT_RADIUS_M)),
    [visible, position],
  );
  const selected = shops.find((s) => s.id === selectedId);
  const isCustomer = session?.user.role === "customer";

  return (
    <main className="lg:flex lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      {/* 地図（スマホは上、パソコンは右側いっぱい） */}
      <div className="relative h-[58dvh] min-h-[360px] lg:order-2 lg:h-full lg:flex-1">
        <AdBanner onSelect={(id, ad) => openShop(id, ad)} />
        <MapView
          shops={visible}
          me={position}
          meAccuracy={accuracy}
          spots={spots}
          searchRadius={COUPON_HIGHLIGHT_RADIUS_M}
          selectedId={selectedId}
          onSelectShop={(id) => openShop(id)}
          className="h-full"
        />
        <button
          onClick={locate}
          className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-pop hover:bg-slate-50"
        >
          <LocateFixed className="h-4 w-4 text-saga-600" aria-hidden />
          現在地
        </button>
      </div>

      {/* 一覧パネル（スマホは地図の下から重なるシート、パソコンは左側） */}
      <div
        id="home-panel"
        className="relative z-10 -mt-4 rounded-t-2xl bg-white shadow-[0_-4px_24px_rgba(16,24,40,0.10)] lg:order-1 lg:mt-0 lg:w-[420px] lg:shrink-0 lg:overflow-y-auto lg:rounded-none lg:border-r lg:border-slate-200 lg:shadow-none"
      >
        <div className="mx-auto mb-1 mt-2.5 h-1 w-9 rounded-full bg-slate-300 lg:hidden" aria-hidden />
        <section className="px-4 pb-3 pt-3 lg:pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-saga-600">SAGA × GEOSPATIAL × AI</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 lg:text-2xl">
            佐賀おでかけマップ
            <span className="ml-2 align-middle text-sm font-medium text-slate-400">SagaMap</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">地元のお店と、まだ知らない佐賀へ。近くのクーポンを地図で見つけよう！</p>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <button onClick={() => setCategory(null)} className={category === null ? "chip-on" : "chip-off"}>
              <LayoutGrid className="h-4 w-4" aria-hidden />
              すべて
            </button>
            {CATEGORIES.filter((c) => shops.some((s) => s.category === c)).map((c) => (
              <button key={c} onClick={() => setCategory(category === c ? null : c)} className={category === c ? "chip-on" : "chip-off"}>
                <CategoryIcon category={c} className="h-4 w-4" />
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 p-4">
          <LocationAccuracy status={status} accuracy={accuracy} />
          {isFallback && (
            <p className="rounded-lg bg-sun-100 px-3 py-2 text-xs text-amber-800">
              位置情報が取得できなかったため、佐賀駅を現在地として表示しています。
            </p>
          )}

          {selected ? (
            <div id="shop-card" className="scroll-mt-16 space-y-3">
            {selectedAd?.business_id === selected.id && <AdDetail ad={selectedAd} />}
            <div className="overflow-hidden rounded-2xl border-2 border-saga-500">
              <ShopPhoto shop={selected} className="h-40 w-full" />
              <div className="p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <CategoryIcon category={selected.category} className="h-3.5 w-3.5" />
                  {selected.category}
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900">{selected.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{selected.service_description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selected.address}
                  {position && `・現在地から ${formatDistance(haversineMeters(position, selected))}`}
                </p>
                {selected.has_coupon && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-coral-50 px-2 py-0.5 text-xs font-semibold text-coupon">
                    <Ticket className="h-3.5 w-3.5" aria-hidden />
                    クーポン配信中
                  </p>
                )}
                {coupons.map((c) => (
                  <div key={c.id} className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-coupon/40 bg-coral-50/60 p-3">
                    <span className="text-2xl font-bold tabular-nums text-coupon">{c.discount_rate}%</span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-semibold">{c.title}</span>
                      <span className="text-xs text-slate-500">
                        {c.conditions && `${c.conditions}・`}
                        {new Date(c.expires_at).toLocaleDateString("ja-JP")}まで
                      </span>
                    </span>
                  </div>
                ))}
                <Link
                  href={isCustomer ? `/dashboard/customer?shop=${selected.id}` : `/shops/${selected.id}`}
                  className="btn-primary mt-3 w-full"
                >
                  {isCustomer ? "クーポン・道順を見る" : "店舗情報を確認する"}
                </Link>
                {!session && coupons.length > 0 && (
                  <Link href="/register/customer" className="btn-outline mt-2 w-full">
                    無料の会員登録でクーポンを使う
                  </Link>
                )}
              </div>
            </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral-50 text-coupon" aria-hidden>
                <Ticket className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  現在地から 500m 以内に
                  <span className="mx-1 text-2xl font-bold tabular-nums text-coupon">{nearbyCoupons.length}</span>
                  件のクーポン店
                </p>
                <p className="text-xs text-slate-500">
                  {shops.length === 0 ? "掲載店舗を募集中です。お店の方はぜひ無料で掲載してください！" : "ピンをタップすると店舗情報が表示されます。"}
                </p>
              </div>
            </div>
          )}

          {!session && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link href="/register/customer" className="group flex items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-saga-300 hover:bg-saga-50/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saga-50 text-saga-600" aria-hidden>
                  <Luggage className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">観光で来た方</span>
                  <span className="mt-0.5 block text-sm text-slate-600">クーポン検索・AI おすすめ・徒歩ルート案内が、無料の会員登録で使えます。</span>
                  <span className="mt-2 inline-flex items-center gap-0.5 text-sm font-semibold text-saga-600">
                    無料で会員登録
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </span>
              </Link>
              <Link href="/register/business" className="group flex items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-saga-300 hover:bg-saga-50/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600" aria-hidden>
                  <Store className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">お店を営む方</span>
                  <span className="mt-0.5 block text-sm text-slate-600">無料で 1 店舗を地図に掲載。有料プランでクーポン発行・広告出稿もできます。</span>
                  <span className="mt-2 inline-flex items-center gap-0.5 text-sm font-semibold text-saga-600">
                    店舗を無料で掲載
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </span>
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

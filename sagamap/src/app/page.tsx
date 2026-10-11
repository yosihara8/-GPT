"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import MapView, { hasCoupon, isHighlighted, type MapShop, type MapSpot, type RouteSummary } from "@/components/MapView";
import AdBanner, { AdDetail, type Ad } from "@/components/AdBanner";
import { scrollToElement } from "@/lib/scroll";
import ShopPhoto from "@/components/ShopPhoto";
import LocationAccuracy from "@/components/LocationAccuracy";
import RouteBox from "@/components/RouteBox";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CATEGORIES, COUPON_HIGHLIGHT_RADIUS_M, PRICE_LEVEL_LABELS } from "@/lib/config";
import CategoryIcon from "@/components/CategoryIcon";
import { ChevronRight, ExternalLink, LayoutGrid, LocateFixed, Luggage, MapPin, Navigation, Sparkles, Store, Ticket, X } from "lucide-react";
import { formatDistance, haversineMeters } from "@/lib/geo";
import { api } from "@/lib/fetcher";

type Shop = MapShop & { address: string; service_description: string; has_photo?: boolean };
type Coupon = { id: number; title: string; discount_rate: number; conditions: string; expires_at: string };
type Detail = {
  business: {
    id: number;
    contact?: string;
    price_level?: number;
    instagram_url?: string | null;
    twitter_url?: string | null;
  };
  coupons: Coupon[];
};
type Rec = { id: number; name: string; category: string; reasons?: string[] };

/** トップ: 店舗一覧の地図（会員登録なしで閲覧できる集客の入り口） */
export default function HomePage() {
  const { data: session } = useSession();
  const { position, accuracy, isFallback, status, locate } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  // 経路（「経路を表示」を押したあとは、別のお店を選ぶとそのお店への経路も自動で表示）
  const [routeOn, setRouteOn] = useState(false);
  const [routeMode, setRouteMode] = useState<"foot" | "car">("foot");
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const isCustomer = session?.user.role === "customer";

  // 地図のピン・広告・一覧をタップしたら、同じページの中でお店の内容（クーポン・経路）を表示する
  const openShop = useCallback((id: number, ad: Ad | null = null) => {
    setSelectedAd(ad);
    setSelectedId(id);
    setMessage(null);
    setTimeout(() => scrollToElement("shop-card", "home-panel"), 80);
  }, []);
  useEffect(() => {
    setDetail(null);
    if (!selectedId) return;
    fetch(`/api/businesses/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail({ business: d.business ?? { id: selectedId }, coupons: d.coupons ?? [] }))
      .catch(() => setDetail(null));
  }, [selectedId]);

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => setShops(d.businesses ?? []));
    fetch("/api/spots").then((r) => r.json()).then((d) => setSpots(d.spots ?? []));
  }, []);

  // 会員の方には AI のおすすめ（閲覧・利用履歴から）
  useEffect(() => {
    if (!isCustomer) return;
    const q = position ? `?lat=${position.lat}&lng=${position.lng}` : "";
    api<{ recommendations: Rec[] }>(`/api/recommend${q}`)
      .then((d) => setRecs(d.recommendations))
      .catch(() => setRecs([]));
  }, [isCustomer, position]);

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

  // 経路の行き先（選んだお店）
  const routeStops = useMemo<MapSpot[] | null>(
    () => (routeOn && selected ? [{ id: selected.id, name: selected.name, lat: selected.lat, lng: selected.lng }] : null),
    [routeOn, selected],
  );
  useEffect(() => {
    if (!routeStops) return;
    setRoute(null);
    setRouteError(null);
    setRouteLoading(true);
  }, [routeStops, routeMode]);

  // 近くのお店（距離順）と、おすすめのお店
  const dist = useCallback((s: { lat: number; lng: number }) => (position ? haversineMeters(position, s) : 0), [position]);
  const nearbyList = useMemo(
    () => [...visible].filter((s) => s.id !== selectedId).sort((a, b) => dist(a) - dist(b)).slice(0, 8),
    [visible, selectedId, dist],
  );
  const recList = useMemo(() => {
    if (recs.length) {
      const byId = new Map(shops.map((s) => [s.id, s]));
      return recs.map((r) => byId.get(r.id)).filter((s): s is Shop => Boolean(s) && s!.id !== selectedId).slice(0, 8);
    }
    // 会員登録前は、クーポンを配信中のお店を近い順におすすめ
    return [...visible].filter((s) => hasCoupon(s) && s.id !== selectedId).sort((a, b) => dist(a) - dist(b)).slice(0, 8);
  }, [recs, shops, visible, selectedId, dist]);

  async function redeemCoupon(id: number) {
    try {
      await api(`/api/coupons/${id}/use`, { method: "POST" });
      setMessage("クーポンを利用しました。店員さんにこの画面を見せてください。");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  const b = detail?.business;

  return (
    <main className="lg:flex lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      {/* 地図（スマホは画面上部に固定して、下の内容をスクロールしても見える。パソコンは右側いっぱい） */}
      <div className="sticky top-14 z-20 h-[45dvh] min-h-[300px] lg:relative lg:top-0 lg:order-2 lg:h-full lg:flex-1">
        <AdBanner onSelect={(id, ad) => openShop(id, ad)} />
        <MapView
          shops={visible}
          me={position}
          meAccuracy={accuracy}
          spots={spots}
          searchRadius={COUPON_HIGHLIGHT_RADIUS_M}
          selectedId={selectedId}
          onSelectShop={(id) => openShop(id)}
          routeStops={routeStops}
          routeMode={routeMode}
          onRoute={(r, err) => {
            setRoute(r);
            setRouteError(err ?? null);
            setRouteLoading(false);
          }}
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

      {/* 一覧パネル（スマホは地図の下、パソコンは左側） */}
      <div
        id="home-panel"
        className="relative z-10 bg-white lg:order-1 lg:w-[420px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-slate-200"
      >
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
            <div id="shop-card" className="space-y-3 [scroll-margin-top:calc(3.5rem+45dvh+8px)] lg:[scroll-margin-top:0]">
              {selectedAd?.business_id === selected.id && <AdDetail ad={selectedAd} />}
              <div className="overflow-hidden rounded-2xl border-2 border-saga-500">
                {selected.has_photo && <ShopPhoto shop={selected} className="h-36 w-full" />}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <CategoryIcon category={selected.category} className="h-3.5 w-3.5" />
                        {selected.category}
                        {b?.price_level ? `　${PRICE_LEVEL_LABELS[b.price_level]}` : ""}
                      </p>
                      <h2 className="mt-0.5 text-lg font-bold text-slate-900">{selected.name}</h2>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedId(null);
                        setSelectedAd(null);
                        setRouteOn(false);
                      }}
                      aria-label="閉じる"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{selected.service_description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selected.address}
                    {position && `・現在地から ${formatDistance(haversineMeters(position, selected))}`}
                    {b?.contact && `・${b.contact}`}
                  </p>
                  {(b?.instagram_url || b?.twitter_url) && (
                    <p className="mt-1 flex gap-3 text-xs">
                      {b?.instagram_url && (
                        <a href={b.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-saga-600 underline">
                          Instagram
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                      {b?.twitter_url && (
                        <a href={b.twitter_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-saga-600 underline">
                          X（Twitter）
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                    </p>
                  )}

                  {/* クーポン */}
                  {selected.has_coupon && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-coral-50 px-2 py-0.5 text-xs font-semibold text-coupon">
                      <Ticket className="h-3.5 w-3.5" aria-hidden />
                      クーポン配信中
                    </p>
                  )}
                  {detail?.coupons.map((c) => (
                    <div key={c.id} className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-coupon/40 bg-coral-50/60 p-3">
                      <span className="text-2xl font-bold tabular-nums text-coupon">{c.discount_rate}%</span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block font-semibold">{c.title}</span>
                        <span className="text-xs text-slate-500">
                          {c.conditions && `${c.conditions}・`}
                          {new Date(c.expires_at).toLocaleDateString("ja-JP")}まで
                        </span>
                      </span>
                      {isCustomer && (
                        <button onClick={() => redeemCoupon(c.id)} className="btn-primary shrink-0 px-3 py-1.5">
                          使う
                        </button>
                      )}
                    </div>
                  ))}
                  {message && <p className="mt-2 rounded-lg bg-saga-50 px-3 py-2 text-sm font-medium text-saga-700">{message}</p>}

                  {/* 経路 */}
                  {routeOn ? (
                    <RouteBox
                      route={route}
                      loading={routeLoading}
                      error={routeError}
                      mode={routeMode}
                      onMode={setRouteMode}
                      onClear={() => {
                        setRouteOn(false);
                        setRoute(null);
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setRouteOn(true);
                        scrollToElement("shop-card", "home-panel");
                      }}
                      className="btn-primary mt-3 w-full"
                    >
                      <Navigation className="h-4 w-4" aria-hidden />
                      経路を表示
                    </button>
                  )}
                  {!session && (detail?.coupons.length ?? 0) > 0 && (
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

          {/* 近くのお店・おすすめのお店（タップで上にお店の内容を表示） */}
          <ShopList title="近くのお店" icon={<MapPin className="h-4 w-4 text-slate-400" aria-hidden />} shops={nearbyList} dist={dist} onOpen={openShop} />
          <ShopList
            title={recs.length ? "あなたへのおすすめ" : "おすすめのお店（クーポン配信中）"}
            icon={<Sparkles className="h-4 w-4 text-slate-400" aria-hidden />}
            shops={recList}
            dist={dist}
            onOpen={openShop}
          />

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

/** お店の一覧（タップでそのお店の内容を上に表示） */
function ShopList({
  title,
  icon,
  shops,
  dist,
  onOpen,
}: {
  title: string;
  icon: React.ReactNode;
  shops: Shop[];
  dist: (s: { lat: number; lng: number }) => number;
  onOpen: (id: number) => void;
}) {
  if (shops.length === 0) return null;
  return (
    <section className="pt-1">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        {icon}
        {title}
      </h3>
      <ul className="space-y-2">
        {shops.map((s) => (
          <li key={s.id}>
            <button onClick={() => onOpen(s.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${hasCoupon(s) ? "bg-coral-50 text-coupon" : "bg-saga-50 text-saga-600"}`}
                aria-hidden
              >
                <CategoryIcon category={s.category} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {s.category}
                  {dist(s) > 0 && `・${formatDistance(dist(s))}`}
                </span>
              </span>
              {hasCoupon(s) && <span className="shrink-0 rounded-md bg-coral-50 px-2 py-0.5 text-xs font-semibold text-coupon">クーポン</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

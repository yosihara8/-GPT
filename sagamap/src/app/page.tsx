"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, ChevronRight, Heart, Landmark, LayoutGrid, LocateFixed, MapPin, Megaphone, Search, Sparkles, Ticket, X } from "lucide-react";
import MapView, { hasCoupon, type MapShop, type MapSpot, type RouteSummary } from "@/components/MapView";
import { trackAd, useActiveAds, type Ad } from "@/components/AdBanner";
import CategoryIcon from "@/components/CategoryIcon";
import LocationAccuracy from "@/components/LocationAccuracy";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import RouteBox from "@/components/RouteBox";
import Carousel from "@/components/customer/Carousel";
import { AdCard, CouponCard, ShopCard, SpotCard, travelText, type CardCoupon } from "@/components/customer/Cards";
import ShopSheet, { type SheetCoupon, type SheetShop } from "@/components/customer/ShopSheet";
import CouponUse, { type UseTarget } from "@/components/customer/CouponUse";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CATEGORIES } from "@/lib/config";
import { haversineMeters } from "@/lib/geo";
import { api } from "@/lib/fetcher";
import { scrollToElement } from "@/lib/scroll";

type Shop = MapShop &
  SheetShop & { address: string; service_description: string; has_photo?: boolean; photo_version?: number | null; best_discount?: number | null };
type Spot = MapSpot & { description?: string };
type Rec = { id: number; reasons?: string[] };
type Favorite = { id: number; name: string; lat: number; lng: number };

export default function HomePage() {
  return (
    <Suspense>
      <CustomerHome />
    </Suspense>
  );
}

/**
 * お客さまの画面（地図・お店・クーポン・経路を 1 ページで）
 *  - 地図は上に固定。検索と業種の切り替えは地図の上
 *  - お店を選ぶと、その場でお店の内容（行動ボタン・クーポン・経路）を表示
 *  - 下に「近くのクーポン」「あなたへのおすすめ」「近くのお店」「PR」「観光スポット」を横にスライドして見る
 */
function CustomerHome() {
  const params = useSearchParams();
  const { data: session } = useSession();
  const isCustomer = session?.user.role === "customer";
  const { position, accuracy, isFallback, status, locate } = useGeolocation();
  // 測位中は位置が細かく変わるため、約 100m 単位にまとめて再読み込みを減らす
  const here = useMemo(
    () => (position ? { lat: Math.round(position.lat * 1000) / 1000, lng: Math.round(position.lng * 1000) / 1000 } : null),
    [position],
  );

  const [shops, setShops] = useState<Shop[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [coupons, setCoupons] = useState<CardCoupon[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [unread, setUnread] = useState(0);
  const ads = useActiveAds();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(Number(params.get("shop")) || null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [detail, setDetail] = useState<{ business: Partial<SheetShop>; coupons: SheetCoupon[] } | null>(null);
  const [useTarget, setUseTarget] = useState<UseTarget | null>(null);

  // 経路（表示中に別のお店を選ぶと、そのお店への経路に切り替わる）
  const [routeOn, setRouteOn] = useState(false);
  const [favRoute, setFavRoute] = useState(params.get("route") === "fav");
  const [routeMode, setRouteMode] = useState<"foot" | "car">("foot");
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => setShops(d.businesses ?? []));
    fetch("/api/spots").then((r) => r.json()).then((d) => setSpots(d.spots ?? []));
  }, []);

  const loadFavorites = useCallback(() => {
    api<{ favorites: Favorite[] }>("/api/favorites").then((d) => setFavorites(d.favorites)).catch(() => setFavorites([]));
  }, []);
  useEffect(() => {
    if (!isCustomer) return;
    loadFavorites();
    api<{ notifications: { read_at: string | null }[] }>("/api/notifications")
      .then((d) => setUnread(d.notifications.filter((n) => !n.read_at).length))
      .catch(() => setUnread(0));
  }, [isCustomer, loadFavorites]);

  useEffect(() => {
    if (!isCustomer || !here) return;
    api<{ coupons: CardCoupon[] }>(`/api/coupons?lat=${here.lat}&lng=${here.lng}&radius=30000`)
      .then((d) => setCoupons(d.coupons))
      .catch(() => setCoupons([]));
  }, [isCustomer, here]);

  const loadRecs = useCallback(() => {
    if (!isCustomer) return;
    const q = here ? `?lat=${here.lat}&lng=${here.lng}` : "";
    api<{ recommendations: Rec[] }>(`/api/recommend${q}`)
      .then((d) => setRecs(d.recommendations))
      .catch(() => setRecs([]));
  }, [isCustomer, here]);
  useEffect(loadRecs, [loadRecs]);

  // 人の流れの実測のため、地図を開いた場所を匿名で記録（約 100m 単位・1 回だけ）
  const pinged = useRef(false);
  useEffect(() => {
    if (pinged.current || status !== "ok" || !position || (accuracy ?? Infinity) > 300) return;
    pinged.current = true;
    fetch("/api/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(position) }).catch(() => undefined);
  }, [status, position, accuracy]);

  // お店の詳細（会員は閲覧履歴として記録され、おすすめに反映される）
  useEffect(() => {
    setDetail(null);
    if (!selectedId) return;
    fetch(`/api/businesses/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail({ business: d.business ?? {}, coupons: d.coupons ?? [] }))
      .catch(() => setDetail(null));
  }, [selectedId]);

  const dist = useCallback((p: { lat: number; lng: number }) => (here ? haversineMeters(here, p) : null), [here]);
  const favIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);
  async function toggleFavorite(id: number) {
    if (!isCustomer) return;
    if (favIds.has(id)) await api(`/api/favorites?businessId=${id}`, { method: "DELETE" });
    else await api("/api/favorites", { method: "POST", body: JSON.stringify({ businessId: id }) });
    loadFavorites();
  }

  const openShop = useCallback((id: number, ad: Ad | null = null) => {
    setSelectedAd(ad);
    setSelectedSpot(null);
    setSelectedId(id);
    setTimeout(() => scrollToElement("shop-card", "home-panel"), 80);
  }, []);
  const openSpot = useCallback((s: Spot) => {
    setSelectedId(null);
    setSelectedAd(null);
    setSelectedSpot(s);
    setRouteOn(true);
    setTimeout(() => scrollToElement("shop-card", "home-panel"), 80);
  }, []);
  const closeSheet = () => {
    setSelectedId(null);
    setSelectedSpot(null);
    setSelectedAd(null);
    setRouteOn(false);
  };

  // 検索（店名・業種・紹介文・住所）と業種の切り替え
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    let xs = category ? shops.filter((s) => s.category === category) : shops;
    if (q) xs = xs.filter((s) => `${s.name} ${s.category} ${s.service_description} ${s.address}`.toLowerCase().includes(q));
    return xs;
  }, [shops, category, q]);
  const byDistance = useCallback(<T extends { lat: number; lng: number }>(xs: T[]) => [...xs].sort((a, b) => (dist(a) ?? 0) - (dist(b) ?? 0)), [dist]);

  const selected = shops.find((s) => s.id === selectedId) ?? null;
  const sheetShop: SheetShop | null = selected ? { ...selected, ...detail?.business } : null;

  // 経路の行き先：選んだお店／観光スポット／お気に入りを巡るルート
  const routeStops = useMemo<MapSpot[] | null>(() => {
    if (routeOn && selected) return [{ id: selected.id, name: selected.name, lat: selected.lat, lng: selected.lng }];
    if (routeOn && selectedSpot) return [selectedSpot];
    if (favRoute && favorites.length) return favorites.slice(0, 9).map((f) => ({ id: f.id, name: f.name, lat: f.lat, lng: f.lng }));
    return null;
  }, [routeOn, selected, selectedSpot, favRoute, favorites]);
  useEffect(() => {
    if (!routeStops) return;
    setRoute(null);
    setRouteError(null);
    setRouteLoading(true);
  }, [routeStops, routeMode]);

  // 横スライドの一覧（同じお店をくり返し出さない）
  const couponList = useMemo(() => {
    const xs = category ? coupons.filter((c) => shops.find((s) => s.id === c.business_id)?.category === category) : coupons;
    return [...xs].sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0)).slice(0, 15);
  }, [coupons, category, shops]);
  const recList = useMemo(() => {
    const byId = new Map(visible.map((s) => [s.id, s]));
    const fromAi = recs.map((r) => ({ shop: byId.get(r.id), note: r.reasons?.[0] })).filter((x): x is { shop: Shop; note: string | undefined } => Boolean(x.shop));
    if (fromAi.length) return fromAi.slice(0, 10);
    return byDistance(visible.filter(hasCoupon)).slice(0, 10).map((shop) => ({ shop, note: undefined }));
  }, [recs, visible, byDistance]);
  const recIds = useMemo(() => new Set(recList.map((r) => r.shop.id)), [recList]);
  const nearList = useMemo(() => byDistance(visible.filter((s) => !recIds.has(s.id))).slice(0, 12), [visible, recIds, byDistance]);
  const spotList = useMemo(() => byDistance(spots).slice(0, 12), [spots, byDistance]);

  // PR は表示された時点で「表示」として記録（この画面を開いている間は 1 広告 1 回）
  const seenAds = useRef(new Set<number>());
  useEffect(() => {
    if (document.visibilityState !== "visible") return;
    for (const ad of ads) {
      if (seenAds.current.has(ad.id)) continue;
      seenAds.current.add(ad.id);
      trackAd(ad.id, "view");
    }
  }, [ads]);

  // 時間帯のあいさつ（サーバーとブラウザで時刻がずれないよう、表示後に決める）
  const [hello, setHello] = useState("ようこそ");
  useEffect(() => setHello(greeting()), []);

  const categories = CATEGORIES.filter((c) => shops.some((s) => s.category === c));
  const name = session?.user.name;
  const nearbyCouponCount = coupons.filter((c) => (c.distance_m ?? Infinity) <= 1000).length;

  return (
    <main className="lg:flex lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      {/* 地図（スマホは上に固定。パソコンは右側いっぱい） */}
      <div className="sticky top-14 z-20 h-[42dvh] min-h-[280px] lg:relative lg:top-0 lg:order-2 lg:h-full lg:flex-1">
        <MapView
          shops={visible}
          me={position}
          meAccuracy={accuracy}
          spots={spots}
          highlightRadius={Number.POSITIVE_INFINITY}
          selectedId={selectedId}
          onSelectShop={(id) => openShop(id)}
          routeStops={routeStops}
          routeMode={routeMode}
          onRoute={(r, err) => {
            setRoute(r);
            setRouteError(err ?? null);
            setRouteLoading(false);
          }}
          legend={false}
          className="h-full"
        />
        {/* 検索と業種（地図の上） */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] space-y-2 p-3">
          <label className="pointer-events-auto flex h-11 items-center gap-2 rounded-full lg:max-w-lg bg-white px-4 shadow-[0_2px_10px_rgba(20,40,77,0.18)] ring-1 ring-slate-200/70">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="お店・料理・地名でさがす"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
              aria-label="お店をさがす"
              enterKeyHint="search"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="検索をやめる" className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </label>
          <div className="pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setCategory(null)} className={`${category === null ? "chip-on" : "chip-off"} shadow-pop`}>
              <LayoutGrid className="h-4 w-4" aria-hidden />
              すべて
            </button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(category === c ? null : c)} className={`${category === c ? "chip-on" : "chip-off"} shadow-pop`}>
                <CategoryIcon category={c} className="h-4 w-4" />
                {c}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={locate}
          aria-label="現在地に戻る"
          className="absolute bottom-3 right-3 z-[600] flex h-11 w-11 items-center justify-center rounded-full bg-white text-saga-600 shadow-pop hover:bg-slate-50"
        >
          <LocateFixed className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* 一覧パネル（スマホは地図の下、パソコンは左側） */}
      <div id="home-panel" className="relative z-10 bg-cream pb-6 lg:order-1 lg:w-[460px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-slate-200">
        <div className="space-y-2 px-4 pt-3 empty:hidden">
          <VerifyEmailBanner />
          <LocationAccuracy status={status} accuracy={accuracy} />
          {isFallback && <p className="rounded-xl bg-sun-100 px-3 py-2 text-xs text-amber-800">位置情報が取得できないため、佐賀駅を現在地としています。</p>}
        </div>

        {/* 検索の結果 */}
        {q ? (
          <section className="px-4 pt-3">
            <h2 className="text-[15px] font-bold">
              「{query.trim()}」のお店 <span className="num text-sm text-slate-400">{visible.length}</span>
            </h2>
            {visible.length === 0 && <p className="mt-2 text-sm text-slate-500">見つかりませんでした。別の言葉でさがしてみてください。</p>}
            <ul className="mt-2 space-y-2">
              {byDistance(visible).slice(0, 30).map((s) => (
                <li key={s.id}>
                  <button onClick={() => { setQuery(""); openShop(s.id); }} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200/70">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saga-50 text-saga-600" aria-hidden>
                      <CategoryIcon category={s.category} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{s.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {s.category}・{travelText(dist(s))}
                      </span>
                    </span>
                    {(s.best_discount ?? 0) > 0 && <span className="num shrink-0 rounded-lg bg-coral-50 px-2 py-1 text-xs font-bold text-coupon">{s.best_discount}%OFF</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          !sheetShop &&
          !selectedSpot && (
            <section className="px-4 pt-4">
              <p className="text-xs font-bold text-asa-500">{hello}</p>
              <h1 className="mt-0.5 text-[22px] font-extrabold leading-snug text-slate-900">{name ? `${name}さん、今日はどこへ行こう。` : "今日は、どこへ行こう。"}</h1>
              {isCustomer && (
                <p className="mt-1 text-sm text-slate-600">
                  {nearbyCouponCount > 0 ? (
                    <>
                      近く（1km 以内）で使えるクーポンが <b className="num text-lg text-coupon">{nearbyCouponCount}</b> 件あります
                    </>
                  ) : (
                    "地図のピンや、下の一覧からお店を選べます"
                  )}
                </p>
              )}
              {unread > 0 && (
                <Link href="/dashboard/customer#news" className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-sm ring-1 ring-slate-200/70">
                  <Bell className="h-4 w-4 text-asa-500" aria-hidden />
                  新しいお知らせが <b className="num text-asa-500">{unread}</b> 件あります
                </Link>
              )}
            </section>
          )
        )}

        {/* 選んだお店／観光スポット */}
        {sheetShop && !q && (
          <ShopSheet
            shop={sheetShop}
            coupons={detail?.coupons ?? null}
            ad={selectedAd?.business_id === sheetShop.id ? selectedAd : null}
            meters={dist(sheetShop)}
            favorite={favIds.has(sheetShop.id)}
            routeOn={routeOn}
            route={route}
            routeLoading={routeLoading}
            routeError={routeError}
            routeMode={routeMode}
            onRoute={() => {
              setFavRoute(false);
              setRouteOn(true);
            }}
            onRouteMode={setRouteMode}
            onRouteClear={() => setRouteOn(false)}
            onFavorite={() => toggleFavorite(sheetShop.id)}
            onUseCoupon={(c) => setUseTarget({ ...c, shopName: sheetShop.name })}
            onClose={closeSheet}
          />
        )}
        {selectedSpot && !q && (
          <article id="shop-card" className="mx-4 mt-3 rounded-3xl bg-white p-4 shadow-[0_2px_4px_rgba(20,40,77,0.05),0_12px_32px_rgba(20,40,77,0.12)] ring-1 ring-slate-200/70 [scroll-margin-top:calc(3.5rem+42dvh+8px)] lg:[scroll-margin-top:12px]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1 text-xs font-medium text-sun-500">
                  <Landmark className="h-3.5 w-3.5" aria-hidden />
                  観光スポット{dist(selectedSpot) != null && `・${travelText(dist(selectedSpot))}`}
                </p>
                <h2 className="mt-1 font-mincho text-[22px] font-bold">{selectedSpot.name}</h2>
              </div>
              <button onClick={closeSheet} aria-label="閉じる" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {selectedSpot.description && <p className="mt-1 text-sm text-slate-600">{selectedSpot.description}</p>}
            <RouteBox route={route} loading={routeLoading} error={routeError} mode={routeMode} onMode={setRouteMode} onClear={closeSheet} />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedSpot.lat},${selectedSpot.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-bold text-saga-600"
            >
              Google マップで開く
            </a>
          </article>
        )}
        {favRoute && !selected && !selectedSpot && favorites.length > 0 && (
          <section className="mx-4 mt-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200/70">
            <p className="flex items-center gap-1.5 font-bold">
              <Heart className="h-4 w-4 fill-coupon text-coupon" aria-hidden />
              お気に入り {Math.min(9, favorites.length)} か所を巡るルート
            </p>
            {route?.legs && (
              <ol className="mt-2 space-y-1 text-sm">
                {route.legs.map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">
                      <b className="num mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white">{i + 1}</b>
                      {l.to}
                    </span>
                    <span className="shrink-0 text-slate-500">{l.duration}</span>
                  </li>
                ))}
              </ol>
            )}
            <RouteBox route={route} loading={routeLoading} error={routeError} mode={routeMode} onMode={setRouteMode} onClear={() => setFavRoute(false)} />
          </section>
        )}

        {!q && (
          <>
            {isCustomer && couponList.length > 0 && (
              <Carousel title="近くのクーポン" icon={<Ticket className="h-4 w-4 text-coupon" aria-hidden />} note="タップすると、お店とクーポンの内容を表示します" count={coupons.length}>
                {couponList.map((c) => (
                  <CouponCard key={c.id} coupon={c} onOpen={() => openShop(c.business_id)} />
                ))}
              </Carousel>
            )}
            {recList.length > 0 && (
              <Carousel title={recs.length ? "あなたへのおすすめ" : "おすすめのお店"} icon={<Sparkles className="h-4 w-4 text-asa-500" aria-hidden />} note={recs.length ? "見たお店・使ったクーポンから選んでいます" : "クーポン配信中のお店"}>
                {recList.map(({ shop, note }) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    meters={dist(shop)}
                    note={note}
                    favorite={favIds.has(shop.id)}
                    onOpen={() => openShop(shop.id)}
                    onFavorite={isCustomer ? () => toggleFavorite(shop.id) : undefined}
                  />
                ))}
              </Carousel>
            )}
            {nearList.length > 0 && (
              <Carousel title="近くのお店" icon={<MapPin className="h-4 w-4 text-saga-600" aria-hidden />} note="現在地から近い順">
                {nearList.map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    meters={dist(shop)}
                    favorite={favIds.has(shop.id)}
                    onOpen={() => openShop(shop.id)}
                    onFavorite={isCustomer ? () => toggleFavorite(shop.id) : undefined}
                  />
                ))}
              </Carousel>
            )}
            {ads.length > 0 && (
              <Carousel title="PR・お店からのお知らせ" icon={<Megaphone className="h-4 w-4 text-slate-500" aria-hidden />}>
                {ads.map((ad) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    onOpen={() => {
                      trackAd(ad.id, "click");
                      openShop(ad.business_id, ad);
                    }}
                  />
                ))}
              </Carousel>
            )}
            {spotList.length > 0 && (
              <Carousel title="観光スポット" icon={<Landmark className="h-4 w-4 text-sun-500" aria-hidden />} note="タップすると、地図に経路を表示します">
                {spotList.map((s) => (
                  <SpotCard key={s.id} name={s.name} description={s.description} meters={dist(s)} onOpen={() => openSpot(s)} />
                ))}
              </Carousel>
            )}
            {shops.length === 0 && <p className="px-4 pt-6 text-sm text-slate-500">掲載店舗を準備中です。</p>}
            {isCustomer && (
              <div className="px-4 pt-2">
                <Link href="/dashboard/customer" className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-bold text-saga-600 ring-1 ring-slate-200/70">
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4" aria-hidden />
                    お気に入り・利用履歴・設定
                  </span>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <CouponUse target={useTarget} onClose={() => setUseTarget(null)} onUsed={loadRecs} />
    </main>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "こんばんは";
  if (h < 11) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "こんばんは";
}

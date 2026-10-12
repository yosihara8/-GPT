"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CircleHelp,
  Bell,
  Clock,
  Car,
  ChevronRight,
  Footprints,
  Heart,
  Landmark,
  LayoutGrid,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Navigation,
  Search,
  Sparkles,
  Store,
  Ticket,
  X,
} from "lucide-react";
import MapView, { hasCoupon, type MapShop, type MapSpot, type RouteSummary } from "@/components/MapView";
import { trackAd, useActiveAds, type Ad } from "@/components/AdBanner";
import CategoryIcon from "@/components/CategoryIcon";
import ShopPhoto from "@/components/ShopPhoto";
import LocationAccuracy from "@/components/LocationAccuracy";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import Carousel from "@/components/customer/Carousel";
import { AdCard, CouponCard, ShopCard, SpotCard, travelText, type CardCoupon } from "@/components/customer/Cards";
import { type SlidePhoto } from "@/components/customer/PhotoSlider";
import DetailSheet, { type DetailCoupon, type DetailShop, type MenuItem, type SheetFrom } from "@/components/customer/DetailSheet";
import CouponUse, { type UseTarget } from "@/components/customer/CouponUse";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CATEGORIES } from "@/lib/config";
import { formatDistance, haversineMeters } from "@/lib/geo";
import { shopStatus } from "@/lib/open-status";
import { paymentTags } from "@/lib/payment";
import { useNotifications } from "@/hooks/useNotifications";
import NoticeSheet from "@/components/customer/NoticeSheet";
import EventBanners from "@/components/customer/EventBanners";
import GuideTour, { guideUnseen, type TourStep } from "@/components/customer/GuideTour";
import { api } from "@/lib/fetcher";

type Shop = MapShop & DetailShop & { address: string; service_description: string };
type Spot = MapSpot & { description?: string };
type Rec = { id: number; reasons?: string[] };
type Favorite = { id: number; name: string; lat: number; lng: number };
type RouteTarget = { id: number; name: string; lat: number; lng: number; kind: "shop" | "spot"; description?: string };
type ShopEvent = "route" | "call" | "save" | "share" | "coupon_view";

export default function HomePage() {
  return (
    <Suspense>
      <CustomerHome />
    </Suspense>
  );
}

/** 事業主向けの統計に、お客さまの行動を記録する（失敗しても画面には影響させない） */
function trackShop(id: number, kind: ShopEvent) {
  fetch(`/api/businesses/${id}/event`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) }).catch(
    () => undefined,
  );
}

/**
 * お客さまの画面（地図・お店・クーポン・経路を 1 ページで）
 *  1 回目のタップ：カード・クーポン・PR → お店のページ（画面いっぱい）。地図のピン → 地図の下に小さな案内
 *  2 回目のタップ：経路（地図に表示）／電話／クーポンを使う
 *  3 回目のタップ：ナビ開始・利用済みの画面・近くのお店へ
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
  const notes = useNotifications(isCustomer);
  const unread = notes.unread;
  const [noticeOpen, setNoticeOpen] = useState(false);
  // 初めてログインしたら、地図の画面で使い方ガイドを出す（端末ごとに 1 回。あとから「使い方」でもう一度見られる）
  const [guideOpen, setGuideOpen] = useState(false);
  const ads = useActiveAds();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  // すぐに行けるお店の絞り込み（営業中・クーポンあり・お店の特徴）
  const [filters, setFilters] = useState<string[]>([]);
  const toggleFilter = (f: string) => setFilters((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]));
  const [preview, setPreview] = useState<number | null>(null);
  const [sheet, setSheet] = useState<{ id: number; from: SheetFrom } | null>(null);
  const [detail, setDetail] = useState<{ id: number; business: Partial<DetailShop>; coupons: DetailCoupon[]; menu: MenuItem[]; photos: SlidePhoto[] } | null>(null);
  const [useTarget, setUseTarget] = useState<UseTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 経路（表示中に別のお店を選ぶと、そのお店への経路に切り替わる）
  const [routeTo, setRouteTo] = useState<RouteTarget | null>(null);
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

  // お店のページを開いたら詳細を読み込む（会員は閲覧履歴として記録され、おすすめに反映される）
  useEffect(() => {
    if (!sheet) return;
    const id = sheet.id;
    if (detail?.id === id) return;
    fetch(`/api/businesses/${id}`)
      .then((r) => r.json())
      .then((d) => setDetail({ id, business: d.business ?? {}, coupons: d.coupons ?? [], menu: d.menu ?? [], photos: d.photos ?? [] }))
      .catch(() => setDetail({ id, business: {}, coupons: [], menu: [], photos: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id]);

  // お店のページは「戻る」（スマホの戻るボタン・ジェスチャー）で閉じられるようにする
  const pushed = useRef(false);
  useEffect(() => {
    const onPop = () => {
      if (pushed.current) {
        pushed.current = false;
        setSheet(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // 開いている間は後ろの画面が動かないようにする
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  const openSheet = useCallback((id: number, from: SheetFrom = { type: "shop" }) => {
    setPreview(null);
    setSheet({ id, from });
    if (!pushed.current) {
      window.history.pushState({ sagamapSheet: true }, "");
      pushed.current = true;
    }
  }, []);
  const closeSheet = useCallback(() => {
    if (pushed.current) window.history.back();
    else setSheet(null);
  }, []);

  useEffect(() => {
    if (!isCustomer || shops.length === 0 || !guideUnseen()) return;
    const t = setTimeout(() => setGuideOpen(true), 900);
    return () => clearTimeout(t);
  }, [isCustomer, shops.length]);

  // お知らせを押したら：お店のお知らせはこの画面でお店のページ、クーポンは近くのクーポンにあればそのクーポンを上に出して開く
  const router = useRouter();
  const openNotice = useCallback(
    (n: { link: string | null }) => {
      if (!n.link) return;
      setNoticeOpen(false);
      const shopId = Number(n.link.match(/[?&]shop=(\d+)/)?.[1]);
      const couponId = Number(n.link.match(/\/coupons\/(\d+)/)?.[1]);
      const c = couponId ? coupons.find((x) => x.id === couponId) : undefined;
      if (c) openSheet(c.business_id, { type: "coupon", couponId: c.id });
      else if (shopId && shops.some((s) => s.id === shopId)) openSheet(shopId);
      else router.push(n.link);
    },
    [coupons, shops, openSheet, router],
  );

  // メール・お知らせのリンク（?shop=ID）から来たら、そのお店のページを開く
  const opened = useRef(false);
  useEffect(() => {
    const id = Number(params.get("shop"));
    if (opened.current || !id || shops.length === 0) return;
    opened.current = true;
    // ?coupon= があれば、そのクーポンをいちばん上に出して開く（イベント特集・ポスターから）
    const couponId = Number(params.get("coupon"));
    if (shops.some((s) => s.id === id)) openSheet(id, couponId ? { type: "coupon", couponId } : { type: "shop" });
  }, [params, shops, openSheet]);

  const dist = useCallback((p: { lat: number; lng: number }) => (here ? haversineMeters(here, p) : null), [here]);
  const favIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);
  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2200);
  };
  async function toggleFavorite(id: number) {
    if (!isCustomer) return;
    if (favIds.has(id)) {
      await api(`/api/favorites?businessId=${id}`, { method: "DELETE" });
      showToast("お気に入りから外しました");
    } else {
      await api("/api/favorites", { method: "POST", body: JSON.stringify({ businessId: id }) });
      trackShop(id, "save");
      showToast("お気に入りに保存しました（マイページで見られます）");
    }
    loadFavorites();
  }
  async function share(shop: { id: number; name: string }) {
    const url = `${location.origin}/shops/${shop.id}`;
    trackShop(shop.id, "share");
    try {
      if (navigator.share) await navigator.share({ title: `${shop.name}｜佐賀観光マップ`, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast("リンクをコピーしました");
      }
    } catch {
      /* 共有をやめた場合は何もしない */
    }
  }

  // 経路を始める：お店のページを閉じて、地図に経路を出す（地図が見える位置まで戻す）
  const startRoute = useCallback(
    (t: RouteTarget) => {
      setFavRoute(false);
      setPreview(null);
      setRouteTo(t);
      if (t.kind === "shop") trackShop(t.id, "route");
      if (pushed.current) closeSheet();
      else setSheet(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [closeSheet],
  );

  // 検索（店名・業種・紹介文・住所）と業種の切り替え
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    let xs = category ? shops.filter((s) => s.category === category) : shops;
    if (q) xs = xs.filter((s) => `${s.name} ${s.category} ${s.service_description} ${s.address} ${(s.amenities ?? []).join(" ")} ${(s.payment_methods ?? []).join(" ")}`.toLowerCase().includes(q));
    for (const f of filters) {
      if (f === "営業中") xs = xs.filter((s) => shopStatus(s)?.open);
      else if (f === "クーポンあり") xs = xs.filter(hasCoupon);
      else if (PAYMENT_FILTERS.includes(f)) xs = xs.filter((s) => paymentTags(s).includes(f));
      else xs = xs.filter((s) => s.amenities?.includes(f));
    }
    return xs;
  }, [shops, category, q, filters]);
  const byDistance = useCallback(<T extends { lat: number; lng: number }>(xs: T[]) => [...xs].sort((a, b) => (dist(a) ?? 0) - (dist(b) ?? 0)), [dist]);

  // 経路の行き先：選んだお店／観光スポット／お気に入りを巡るルート
  const routeStops = useMemo<MapSpot[] | null>(() => {
    if (routeTo) return [{ id: routeTo.id, name: routeTo.name, lat: routeTo.lat, lng: routeTo.lng }];
    if (favRoute && favorites.length) return favorites.slice(0, 9).map((f) => ({ id: f.id, name: f.name, lat: f.lat, lng: f.lng }));
    return null;
  }, [routeTo, favRoute, favorites]);
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

  // お店のページに出す内容
  const sheetBase = sheet ? shops.find((s) => s.id === sheet.id) : undefined;
  const sheetShop: DetailShop | null = sheetBase ? { ...sheetBase, ...(detail?.id === sheet?.id ? detail?.business : {}) } : null;
  const sheetCoupons = detail && detail.id === sheet?.id ? detail.coupons : null;
  const sheetNearby = useMemo(() => {
    if (!sheetBase) return [];
    return shops
      .filter((s) => s.id !== sheetBase.id)
      .map((s) => ({ shop: s, meters: haversineMeters(sheetBase, s) }))
      .filter((x) => x.meters <= 3000)
      .sort((a, b) => Number(hasCoupon(b.shop)) - Number(hasCoupon(a.shop)) || a.meters - b.meters)
      .slice(0, 10);
  }, [sheetBase, shops]);
  const previewShop = preview ? shops.find((s) => s.id === preview) : undefined;
  const routeShop = routeTo?.kind === "shop" ? shops.find((s) => s.id === routeTo.id) : undefined;

  return (
    <main className="lg:flex lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      {/* 地図（スマホは上に固定。パソコンは右側いっぱい） */}
      <div data-tour="map" className="sticky top-14 z-20 h-[42dvh] min-h-[280px] lg:relative lg:top-0 lg:order-2 lg:h-full lg:flex-1">
        <MapView
          shops={visible}
          me={position}
          meAccuracy={accuracy}
          spots={spots}
          highlightRadius={Number.POSITIVE_INFINITY}
          selectedId={sheet?.id ?? preview ?? routeShop?.id ?? null}
          onSelectShop={(id) => setPreview(id)}
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
          <label data-tour="search" className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-white px-4 shadow-[0_2px_10px_rgba(20,40,77,0.18)] ring-1 ring-slate-200/70 lg:max-w-lg">
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
          <div data-tour="filters" className="pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 lg:mr-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_FILTERS.map((f) => (
              <button key={f} onClick={() => toggleFilter(f)} aria-pressed={filters.includes(f)} className={`${filters.includes(f) ? "chip bg-asa-500 text-white" : "chip-off"} shadow-pop`}>
                {f === "営業中" ? <Clock className="h-4 w-4" aria-hidden /> : f === "クーポンあり" ? <Ticket className="h-4 w-4" aria-hidden /> : null}
                {f}
              </button>
            ))}
            <span className="w-px shrink-0 bg-slate-300/70" aria-hidden />
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
          className={`absolute right-3 z-[600] flex h-11 w-11 items-center justify-center rounded-full bg-white text-saga-600 shadow-pop hover:bg-slate-50 ${previewShop || routeTo || favRoute ? "top-[112px]" : "bottom-3"}`}
        >
          <LocateFixed className="h-5 w-5" aria-hidden />
        </button>

        {/* 地図のピンを押したとき：地図の下に小さな案内（もう 1 回押すとお店のページ） */}
        {previewShop && !routeTo && (
          <div className="absolute inset-x-3 bottom-3 z-[700]">
            <PreviewCard
              shop={previewShop}
              meters={dist(previewShop)}
              onOpen={() => openSheet(previewShop.id)}
              onRoute={() => startRoute({ id: previewShop.id, name: previewShop.name, lat: previewShop.lat, lng: previewShop.lng, kind: "shop" })}
              onClose={() => setPreview(null)}
            />
          </div>
        )}

        {/* 経路を表示中：所要時間・ナビ開始・お店の情報へ */}
        {(routeTo || (favRoute && favorites.length > 0)) && (
          <div className="absolute inset-x-3 bottom-3 z-[700]">
            <RouteBar
              title={routeTo ? routeTo.name : `お気に入り ${Math.min(9, favorites.length)} か所を巡るルート`}
              subtitle={routeTo?.kind === "spot" ? routeTo.description : undefined}
              route={route}
              loading={routeLoading}
              error={routeError}
              mode={routeMode}
              onMode={setRouteMode}
              navUrl={
                routeTo
                  ? `https://www.google.com/maps/dir/?api=1&destination=${routeTo.lat},${routeTo.lng}&travelmode=${routeMode === "car" ? "driving" : "walking"}`
                  : null
              }
              onNav={() => routeTo?.kind === "shop" && trackShop(routeTo.id, "route")}
              onInfo={routeTo?.kind === "shop" ? () => openSheet(routeTo.id) : undefined}
              onClose={() => {
                setRouteTo(null);
                setFavRoute(false);
                setRoute(null);
              }}
            />
          </div>
        )}
      </div>

      {/* 一覧パネル（スマホは地図の下、パソコンは左側） */}
      <div id="home-panel" className="relative z-10 bg-cream pb-8 lg:order-1 lg:w-[480px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-slate-200">
        <div className="space-y-2 px-4 pt-3 empty:hidden">
          <VerifyEmailBanner />
          <LocationAccuracy status={status} accuracy={accuracy} />
          {isFallback && <p className="rounded-xl bg-sun-100 px-3 py-2 text-xs text-amber-800">位置情報が取得できないため、佐賀駅を現在地としています。</p>}
        </div>

        {q || filters.length > 0 ? (
          /* 検索の結果 */
          <section className="px-4 pt-3">
            <h2 className="text-[15px] font-bold">
              {q ? `「${query.trim()}」のお店` : `${filters.join("・")}のお店`} <span className="num text-sm text-slate-400">{visible.length}</span>
              {filters.length > 0 && (
                <button onClick={() => setFilters([])} className="ml-2 text-xs font-bold text-saga-600">
                  絞り込みを解除
                </button>
              )}
            </h2>
            {visible.length === 0 && <p className="mt-2 text-sm text-slate-500">見つかりませんでした。別の言葉でさがしてみてください。</p>}
            <ul className="mt-2 space-y-2">
              {byDistance(visible)
                .slice(0, 30)
                .map((s) => (
                  <li key={s.id}>
                    <ResultRow shop={s} meters={dist(s)} onOpen={() => openSheet(s.id)} />
                  </li>
                ))}
            </ul>
          </section>
        ) : (
          <>
            <section className="px-4 pt-4">
              <div className="relative overflow-hidden rounded-3xl bg-[#1F3D73] shadow-[0_10px_28px_rgba(20,40,77,0.18)]">
                <img src="/art/panorama.svg" alt="" className="absolute inset-0 h-full w-full object-cover object-[60%_45%]" aria-hidden />
                <div className="absolute inset-0 bg-gradient-to-r from-[#14284D]/85 via-[#14284D]/45 to-transparent" aria-hidden />
                {isCustomer && (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="absolute right-[3.75rem] top-3 z-10 flex h-10 items-center gap-1 rounded-full bg-white/15 px-3 text-xs font-bold text-white ring-1 ring-white/30 backdrop-blur"
                  >
                    <CircleHelp className="h-4 w-4" aria-hidden />
                    使い方
                  </button>
                )}
                {isCustomer && (
                  <button
                    type="button"
                    onClick={() => setNoticeOpen(true)}
                    aria-label={unread > 0 ? `お知らせ（新着 ${unread} 件）` : "お知らせ"}
                    data-tour="bell"
                    className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur"
                  >
                    <Bell className="h-5 w-5" aria-hidden />
                    {unread > 0 && (
                      <span className="num absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-asa-500 px-1 text-[11px] font-bold">{unread}</span>
                    )}
                  </button>
                )}
                <div className="relative px-5 py-5 text-white">
                  <p className="text-xs font-bold text-white/80">{hello}</p>
                  <h1 className="mt-1 text-[21px] font-extrabold leading-snug drop-shadow">
                    {name ? (
                      <>
                        {name}さん、
                        <br />
                        今日はどこへ行こう。
                      </>
                    ) : (
                      "今日は、どこへ行こう。"
                    )}
                  </h1>
                  {isCustomer && (
                    <p className="mt-2 text-sm text-white/90">
                      {nearbyCouponCount > 0 ? (
                        <>
                          近く（1km 以内）で使えるクーポン <b className="num text-xl text-sun-400">{nearbyCouponCount}</b> 件
                        </>
                      ) : (
                        "地図のピンや、下の一覧からお店を選べます"
                      )}
                    </p>
                  )}
                </div>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => setNoticeOpen(true)}
                  className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-left text-sm ring-1 ring-asa-500/40"
                >
                  <Bell className="h-4 w-4 text-asa-500" aria-hidden />
                  新しいお知らせが <b className="num text-asa-500">{unread}</b> 件あります
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-400" aria-hidden />
                </button>
              )}
            </section>

            <EventBanners />

            {isCustomer && couponList.length > 0 && (
              <div data-tour="coupons">
              <Carousel title="近くのクーポン" eyebrow="COUPON" icon={<Ticket className="h-4 w-4 text-coupon" aria-hidden />} note="タップで、クーポンの条件・お店の情報・行き方を表示" count={coupons.length}>
                {couponList.map((c) => (
                  <CouponCard
                    key={c.id}
                    coupon={c}
                    onOpen={() => {
                      trackShop(c.business_id, "coupon_view");
                      openSheet(c.business_id, { type: "coupon", couponId: c.id });
                    }}
                  />
                ))}
              </Carousel>
              </div>
            )}
            {ads.length > 0 && (
              <Carousel title="PR・お店からのお知らせ" eyebrow="NEWS" icon={<Megaphone className="h-4 w-4 text-slate-500" aria-hidden />} note="タップで、お知らせの全文とお店の情報を表示">
                {ads.map((ad) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    onOpen={() => {
                      trackAd(ad.id, "click");
                      openSheet(ad.business_id, { type: "ad", ad });
                    }}
                  />
                ))}
              </Carousel>
            )}
            {recList.length > 0 && (
              <Carousel title={recs.length ? "あなたへのおすすめ" : "おすすめのお店"} eyebrow="PICK UP" icon={<Sparkles className="h-4 w-4 text-asa-500" aria-hidden />} note={recs.length ? "見たお店・使ったクーポンから選んでいます" : "クーポン配信中のお店"}>
                {recList.map(({ shop, note }) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    meters={dist(shop)}
                    note={note ?? shopStatus(shop)?.label}
                    favorite={favIds.has(shop.id)}
                    onOpen={() => openSheet(shop.id)}
                    onFavorite={isCustomer ? () => toggleFavorite(shop.id) : undefined}
                  />
                ))}
              </Carousel>
            )}
            {nearList.length > 0 && (
              <Carousel title="近くのお店" eyebrow="NEARBY" icon={<MapPin className="h-4 w-4 text-saga-600" aria-hidden />} note="現在地から近い順">
                {nearList.map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    meters={dist(shop)}
                    note={shopStatus(shop)?.label}
                    favorite={favIds.has(shop.id)}
                    onOpen={() => openSheet(shop.id)}
                    onFavorite={isCustomer ? () => toggleFavorite(shop.id) : undefined}
                  />
                ))}
              </Carousel>
            )}
            {spotList.length > 0 && (
              <Carousel title="観光スポット" eyebrow="SIGHTSEEING" icon={<Landmark className="h-4 w-4 text-sun-500" aria-hidden />} note="タップで、地図に行き方を表示">
                {spotList.map((s) => (
                  <SpotCard key={s.id} name={s.name} description={s.description} meters={dist(s)} onOpen={() => startRoute({ ...s, kind: "spot" })} />
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

      {/* お店のページ（画面いっぱい。パソコンは左側。戻るボタンで閉じる） */}
      {sheetShop && (
        <DetailSheet
          shop={sheetShop}
          coupons={sheetCoupons}
          menu={detail && detail.id === sheet?.id ? detail.menu : null}
          photos={detail && detail.id === sheet?.id ? detail.photos : []}
          shopAds={ads.filter((a) => a.business_id === sheetShop.id)}
          from={sheet!.from}
          me={position}
          meters={dist(sheetShop)}
          favorite={favIds.has(sheetShop.id)}
          nearby={sheetNearby}
          favIds={favIds}
          onClose={closeSheet}
          onRoute={() => startRoute({ id: sheetShop.id, name: sheetShop.name, lat: sheetShop.lat, lng: sheetShop.lng, kind: "shop" })}
          onNav={() => trackShop(sheetShop.id, "route")}
          onCall={() => trackShop(sheetShop.id, "call")}
          onFavorite={() => toggleFavorite(sheetShop.id)}
          onShare={() => share(sheetShop)}
          onUseCoupon={(c) => setUseTarget({ ...c, shopName: sheetShop.name })}
          onOpenShop={(id) => setSheet({ id, from: { type: "shop" } })}
          onToggleFavorite={isCustomer ? toggleFavorite : undefined}
        />
      )}

      <CouponUse target={useTarget} onClose={() => setUseTarget(null)} onUsed={loadRecs} />
      <GuideTour steps={GUIDE_STEPS} open={guideOpen} onClose={() => setGuideOpen(false)} />
      <NoticeSheet
        open={noticeOpen}
        items={notes.items}
        freshIds={notes.freshIds}
        onSeen={notes.markSeen}
        onClose={() => setNoticeOpen(false)}
        onOpenNotice={openNotice}
        onDelete={notes.remove}
        onDeleteRead={notes.removeRead}
      />

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[2100] flex justify-center px-4" role="status">
          <p className="rounded-full bg-slate-900/90 px-4 py-2 text-sm font-bold text-white shadow-lg">{toast}</p>
        </div>
      )}
    </main>
  );
}

/** 地図のピンを押したときの小さな案内（写真・割引・営業中・距離） */
function PreviewCard({
  shop,
  meters,
  onOpen,
  onRoute,
  onClose,
}: {
  shop: Shop;
  meters: number | null;
  onOpen: () => void;
  onRoute: () => void;
  onClose: () => void;
}) {
  const status = shopStatus(shop);
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_24px_rgba(20,40,77,0.25)] ring-1 ring-slate-200/70">
      <button onClick={onOpen} className="flex w-full gap-3 p-3 text-left">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
          <ShopPhoto shop={shop} className="h-full w-full" />
          {shop.best_label && (
            <span className="num absolute bottom-1 left-1 rounded-md bg-coupon px-1.5 py-0.5 text-[11px] font-extrabold text-white">{shop.best_label}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <CategoryIcon category={shop.category} className="h-3 w-3" />
            {shop.category}
          </span>
          <span className="mt-0.5 block truncate text-base font-bold text-slate-900">{shop.name}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{travelText(meters)}</span>
          {status && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${status.open ? "bg-tea-100 text-tea-700" : "bg-slate-100 text-slate-600"}`}>{status.label}</span>}
        </span>
      </button>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-slate-100 p-2">
        <button onClick={onOpen} className="btn-outline rounded-full py-2">
          <Store className="h-4 w-4" aria-hidden />
          お店の詳細
        </button>
        <button onClick={onRoute} className="btn-accent rounded-full py-2">
          <Navigation className="h-4 w-4" aria-hidden />
          ここへ行く
        </button>
        <button onClick={onClose} aria-label="閉じる" className="rounded-full px-3 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** 経路を表示している間の帯（徒歩・車／所要時間／ナビ開始／お店の情報） */
function RouteBar({
  title,
  subtitle,
  route,
  loading,
  error,
  mode,
  onMode,
  navUrl,
  onNav,
  onInfo,
  onClose,
}: {
  title: string;
  subtitle?: string;
  route: RouteSummary | null;
  loading: boolean;
  error: string | null;
  mode: "foot" | "car";
  onMode: (m: "foot" | "car") => void;
  navUrl: string | null;
  onNav: () => void;
  onInfo?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-3xl bg-white p-3 shadow-[0_8px_24px_rgba(20,40,77,0.25)] ring-1 ring-slate-200/70">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{title}</p>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          <p className="mt-0.5 text-lg font-extrabold text-saga-600">
            {loading ? (
              <span className="text-sm font-bold">経路を計算しています…</span>
            ) : error ? (
              <span className="text-sm font-bold text-red-600">{error}</span>
            ) : route ? (
              <>
                {route.mode === "WALKING" ? "徒歩" : "車"}で約 <span className="num">{Math.max(1, Math.round(route.totalSeconds / 60))}</span> 分
                <span className="ml-1 text-sm font-bold text-slate-500">（{formatDistance(route.totalMeters)}）</span>
              </>
            ) : null}
          </p>
          {route?.estimated && <p className="text-[11px] text-amber-700">道順を取得できず、直線距離からの目安です</p>}
        </div>
        <div className="flex shrink-0 rounded-full bg-slate-100 p-1 text-xs font-bold">
          {(["foot", "car"] as const).map((m) => (
            <button key={m} onClick={() => onMode(m)} aria-pressed={mode === m} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 ${mode === m ? "bg-saga-600 text-white" : "text-slate-500"}`}>
              {m === "foot" ? <Footprints className="h-3.5 w-3.5" aria-hidden /> : <Car className="h-3.5 w-3.5" aria-hidden />}
              {m === "foot" ? "徒歩" : "車"}
            </button>
          ))}
        </div>
        <button onClick={onClose} aria-label="経路を消す" className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className={`mt-2 grid gap-2 ${onInfo && navUrl ? "grid-cols-2" : "grid-cols-1"}`}>
        {onInfo && (
          <button onClick={onInfo} className="btn-outline rounded-full py-2">
            <Store className="h-4 w-4" aria-hidden />
            お店の情報・クーポン
          </button>
        )}
        {navUrl && (
          <a href={navUrl} target="_blank" rel="noreferrer" onClick={onNav} className="btn-accent rounded-full py-2">
            <MapIcon className="h-4 w-4" aria-hidden />
            ナビを開始
          </a>
        )}
      </div>
      {route?.provider === "osm" && (
        <p className="mt-1 text-right text-[10px] text-slate-400">
          道順 ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
            OpenStreetMap contributors
          </a>
        </p>
      )}
    </div>
  );
}

/** 検索結果の 1 行 */
function ResultRow({ shop: s, meters, onOpen }: { shop: Shop; meters: number | null; onOpen: () => void }) {
  const status = shopStatus(s);
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200/70">
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
        <ShopPhoto shop={s} className="h-full w-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{s.name}</span>
        <span className="block truncate text-xs text-slate-500">
          {s.category}・{travelText(meters)}
        </span>
        {status && <span className={`text-[11px] font-bold ${status.open ? "text-tea-700" : "text-slate-500"}`}>{status.label}</span>}
      </span>
      {s.best_label && <span className="num shrink-0 rounded-lg bg-coral-50 px-2 py-1 text-xs font-bold text-coupon">{s.best_label}</span>}
    </button>
  );
}

/** よく使う絞り込み（地図の上に並べる） */
const GUIDE_STEPS: TourStep[] = [
  { title: "佐賀観光マップへようこそ", body: "近くのお店のクーポンを見つけて、地図で行き方まで調べられます。使い方を 1 分でご案内します。" },
  { target: "search", title: "さがす", body: "お店の名前・料理・地名（例：ランチ、嬉野）で検索できます。" },
  { target: "filters", title: "しぼりこむ", body: "「営業中」「クーポンあり」「駐車場あり」「PayPay などのバーコード決済」などで、今すぐ行けるお店だけを表示します。" },
  { target: "map", title: "地図のピン", body: "赤いピンはクーポン配信中のお店です。ピンを押すと写真・割引・距離が出て、もう 1 回押すとお店のページが開きます。" },
  { target: "coupons", title: "近くのクーポン", body: "近い順に並んでいます。押すと条件・使い方・お店の情報・行き方がすべて見られます。" },
  { target: "bell", title: "お知らせ", body: "近くのお店が新しいクーポンを出すとここに届きます。見たら自動で既読になります。" },
  { target: "mypage", title: "マイページ", body: "お気に入りのお店、使ったクーポン、お知らせメールの設定はここから。" },
  { title: "お店では", body: "お店のページの「クーポンを使う」を押して、表示された画面を店員さんに見せるだけ。「ここへ行く」で道順も出ます。" },
];

const PAYMENT_FILTERS = ["カード払いOK", "バーコード決済OK", "交通系IC OK"];
const QUICK_FILTERS = ["営業中", "クーポンあり", "駐車場あり", "テイクアウト", "子ども連れ歓迎", ...PAYMENT_FILTERS];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "こんばんは";
  if (h < 11) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "こんばんは";
}

"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView, { type HeatPoint, type MapSpot, type RouteSummary } from "@/components/MapView";
import AdBanner, { AdDetail, AdList, useActiveAds, type Ad } from "@/components/AdBanner";
import RouteBox from "@/components/RouteBox";
import CouponRow from "@/components/CouponRow";
import ShopPhoto from "@/components/ShopPhoto";
import { scrollToElement } from "@/lib/scroll";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import LocationAccuracy from "@/components/LocationAccuracy";
import SwipeCards, { type RecCard } from "@/components/SwipeCards";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDistanceMatrix } from "@/hooks/useDistanceMatrix";
import { api } from "@/lib/fetcher";
import { CATEGORIES, PRICE_LEVEL_LABELS } from "@/lib/config";
import CategoryIcon from "@/components/CategoryIcon";
import {
  Bell,
  Car,
  Footprints,
  Heart,
  Landmark,
  LocateFixed,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Sparkles,
  Ticket,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { estimateWalkMinutes, formatDistance, haversineMeters } from "@/lib/geo";

type NearbyShop = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  price_level: number;
  best_discount: number | null;
  distance_m: number;
  walk_minutes: number;
  highlight: boolean;
  has_photo?: boolean;
  photo_version?: number | null;
};
type Coupon = {
  id: number;
  title: string;
  discount_rate: number;
  conditions: string;
  expires_at: string;
  business_id: number;
  business_name: string;
  category: string;
  distance_m: number | null;
  has_image?: boolean;
};
type Detail = {
  business: NearbyShop & { service_description: string; contact: string; instagram_url: string | null; twitter_url: string | null };
  // has_photo / photo_version は NearbyShop と共通
  coupons: Coupon[];
};
type Notification = { id: number; title: string; body: string; link: string | null; created_at: string; read_at: string | null };

const RANGES = [
  { label: "3km", value: 3000 },
  { label: "5km", value: 5000 },
  { label: "8km", value: 8000 },
];
const TABS = ["近く", "お気に入り", "おすすめ", "クーポン", "ルート", "お知らせ"] as const;
const TAB_ICONS: Record<string, LucideIcon> = { 近く: MapPin, お気に入り: Heart, おすすめ: Sparkles, クーポン: Ticket, ルート: RouteIcon, お知らせ: Bell };

type Favorite = { id: number; name: string; address: string; lat: number; lng: number; category: string; price_level: number; best_discount: number | null };
type Stop = MapSpot & { key: string };
type Tab = (typeof TABS)[number];

export default function CustomerDashboardPage() {
  return (
    <Suspense>
      <CustomerDashboard />
    </Suspense>
  );
}

function CustomerDashboard() {
  const params = useSearchParams();
  const { position, accuracy, isFallback, status, locate } = useGeolocation();
  const [tab, setTab] = useState<Tab>("近く");
  const [radius, setRadius] = useState(3000);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [nearby, setNearby] = useState<NearbyShop[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(Number(params.get("shop")) || null);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const ads = useActiveAds();
  // 地図のピン・広告・一覧をタップしたら、そのお店の内容（クーポン含む）まで移動する
  const openShop = useCallback(
    (id: number, ad: Ad | null = null) => {
      setSelectedAd(ad);
      if (id === selectedId) setTimeout(scrollToDetail, 60);
      else setSelectedId(id);
    },
    [selectedId],
  );
  const [detail, setDetail] = useState<Detail | null>(null);
  const [recs, setRecs] = useState<RecCard[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [routeKeys, setRouteKeys] = useState<string[]>([]);
  const [routeMode, setRouteMode] = useState<"foot" | "car">("foot");
  const [routeStops, setRouteStops] = useState<MapSpot[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  // お店の詳細から「経路を表示」したとき（別のお店を選ぶと、そのお店への経路に切り替わる）
  const [routeHere, setRouteHere] = useState(false);
  const [flow, setFlow] = useState<HeatPoint[] | null>(null);
  const [flowHour, setFlowHour] = useState(() => new Date().getHours());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const filterQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (price) q.set("price", price);
    return q;
  }, [category, price]);

  // 近くの店舗（PostGIS 半径検索）
  useEffect(() => {
    if (!position) return;
    const q = new URLSearchParams(filterQuery);
    q.set("lat", String(position.lat));
    q.set("lng", String(position.lng));
    q.set("radius", String(radius));
    api<{ results: NearbyShop[] }>(`/api/search/nearby?${q}`).then((d) => setNearby(d.results));
  }, [position, radius, filterQuery]);

  // クーポン検索
  useEffect(() => {
    if (!position) return;
    const q = new URLSearchParams(filterQuery);
    q.set("lat", String(position.lat));
    q.set("lng", String(position.lng));
    q.set("radius", "30000");
    api<{ coupons: Coupon[] }>(`/api/coupons?${q}`).then((d) => setCoupons(d.coupons));
  }, [position, filterQuery]);

  // AI おすすめ
  const loadRecs = useCallback(() => {
    const q = position ? `?lat=${position.lat}&lng=${position.lng}` : "";
    api<{ recommendations: RecCard[] }>(`/api/recommend${q}`).then((d) => setRecs(d.recommendations));
  }, [position]);
  useEffect(loadRecs, [loadRecs]);

  const loadFavorites = useCallback(
    () => api<{ favorites: Favorite[] }>("/api/favorites").then((d) => setFavorites(d.favorites)),
    [],
  );
  const favIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);
  async function toggleFavorite(id: number) {
    if (favIds.has(id)) await api(`/api/favorites?businessId=${id}`, { method: "DELETE" });
    else await api("/api/favorites", { method: "POST", body: JSON.stringify({ businessId: id }) });
    loadFavorites();
  }

  // ルートの行き先候補（お気に入り・近くのお店・観光名所）
  const stopGroups = useMemo(() => {
    const dist = (p: { lat: number; lng: number }) => (position ? haversineMeters(position, p) : 0);
    const shop = (b: { id: number; name: string; lat: number; lng: number }): Stop => ({ ...b, key: `shop-${b.id}` });
    const byDist = <T extends { lat: number; lng: number }>(xs: T[]) => [...xs].sort((a, b) => dist(a) - dist(b));
    return [
      { title: "お気に入り", icon: Heart, items: byDist(favorites).map(shop) },
      { title: "近くのお店", icon: MapPin, items: nearby.filter((n) => !favIds.has(n.id)).slice(0, 10).map(shop) },
      { title: "観光名所", icon: Landmark, items: byDist(spots).map((s) => ({ ...s, key: `spot-${s.id}` })) },
    ];
  }, [favorites, favIds, nearby, spots, position]);
  const allStops = useMemo(() => new Map(stopGroups.flatMap((g) => g.items).map((s) => [s.key, s])), [stopGroups]);

  function showRoute(keys: string[]) {
    const stops = keys.map((k) => allStops.get(k)).filter(Boolean) as Stop[];
    if (stops.length === 0) return;
    setRouteKeys(keys);
    setRoute(null);
    setRouteError(null);
    setRouteLoading(true);
    setRouteStops(stops);
    setRouteHere(false);
    setTab("ルート");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    loadFavorites();
    api<{ spots: MapSpot[] }>("/api/spots").then((d) => setSpots(d.spots));
    api<{ notifications: Notification[] }>("/api/notifications").then((d) => setNotifications(d.notifications));
  }, [loadFavorites]);

  // 店舗詳細（閲覧履歴として記録され、AI 推薦に反映される）。開いたら詳細の位置までスクロール
  useEffect(() => {
    if (!selectedId) return setDetail(null);
    api<Detail>(`/api/businesses/${selectedId}`).then(setDetail);
  }, [selectedId]);
  // 「経路を表示」中に別のお店を選んだら、そのお店への経路に切り替える
  useEffect(() => {
    if (!routeHere || !detail) return;
    const b = detail.business;
    setRoute(null);
    setRouteError(null);
    setRouteLoading(true);
    setRouteStops([{ id: b.id, name: b.name, lat: b.lat, lng: b.lng }]);
  }, [routeHere, detail]);
  // 詳細が表示されたら（画面に描かれた後で）その位置まで移動する
  useEffect(() => {
    if (!detail) return;
    const t = setTimeout(scrollToDetail, 60);
    return () => clearTimeout(t);
  }, [detail]);

  // 時間帯別の利用者の流れ（実測）
  useEffect(() => {
    if (!flow) return;
    api<{ points: HeatPoint[] }>(`/api/heatmap?type=flow&hour=${flowHour}`).then((d) => setFlow(d.points));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowHour]);
  const toggleFlow = () => {
    if (flow) return setFlow(null);
    api<{ points: HeatPoint[] }>(`/api/heatmap?type=flow&hour=${flowHour}`).then((d) => setFlow(d.points));
  };

  // 徒歩距離・所要時間（Distance Matrix）
  const travel = useDistanceMatrix(position, [
    ...nearby.slice(0, 25),
    ...spots.map((s) => ({ ...s, id: `spot-${s.id}` })),
  ]);

  async function redeemCoupon(id: number) {
    try {
      await api(`/api/coupons/${id}/use`, { method: "POST" });
      setMessage("クーポンを利用しました。店員さんにこの画面を見せてください。");
      loadRecs();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <main className="lg:flex lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <div className="sticky top-14 z-20 h-[45dvh] min-h-[300px] lg:relative lg:top-0 lg:order-2 lg:h-full lg:flex-1">
        <AdBanner ads={ads} onSelect={(id, ad) => openShop(id, ad)} />
        <MapView
          shops={nearby}
          me={position}
          meAccuracy={accuracy}
          searchRadius={radius}
          spots={spots}
          heatmap={flow}
          routeStops={routeStops}
          routeMode={routeMode}
          onRoute={(r, err) => {
            setRoute(r);
            setRouteError(err ?? null);
            setRouteLoading(false);
          }}
          selectedId={selectedId}
          onSelectShop={(id) => openShop(id)}
          className="h-full"
        />
        <div className="absolute bottom-6 right-3 z-10 flex flex-col items-end gap-2 lg:bottom-3">
          <button
            onClick={toggleFlow}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-pop ${flow ? "bg-saga-600 text-white" : "bg-white text-slate-800 hover:bg-slate-50"}`}
          >
            <Users className="h-4 w-4" aria-hidden />
            人の流れ
          </button>
          <button onClick={locate} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-pop hover:bg-slate-50">
            <LocateFixed className="h-4 w-4 text-saga-600" aria-hidden />
            現在地
          </button>
        </div>
      </div>

      <div
        id="customer-panel"
        className="relative z-10 bg-white lg:order-1 lg:w-[440px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-slate-200"
      >

      {flow && (
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-sm">
          <span className="shrink-0 text-slate-600">{flowHour}時台の利用者の流れ（実測）</span>
          <input type="range" min={0} max={23} value={flowHour} onChange={(e) => setFlowHour(Number(e.target.value))} className="w-full accent-saga-600" />
        </div>
      )}

      <div className="space-y-2 px-4 pt-3 empty:hidden">
        <VerifyEmailBanner />
        <LocationAccuracy status={status} accuracy={accuracy} />
      </div>
      {isFallback && (
        <p className="mx-4 mt-2 rounded-lg bg-sun-100 px-3 py-2 text-xs text-amber-800">位置情報が取得できないため、佐賀駅を現在地としています。</p>
      )}
      {message && (
        <p className="mx-4 mt-2 rounded-lg bg-saga-50 px-3 py-2 text-sm font-medium text-saga-700" onClick={() => setMessage(null)}>
          {message}
        </p>
      )}

      {detail && (
        <ShopDetail
          detail={detail}
          travel={travel[detail.business.id]?.duration}
          ad={selectedAd?.business_id === detail.business.id ? selectedAd : null}
          onClose={() => {
            setSelectedId(null);
            setSelectedAd(null);
          }}
          onRedeemCoupon={redeemCoupon}
          isFavorite={favIds.has(detail.business.id)}
          onToggleFavorite={() => toggleFavorite(detail.business.id)}
          routeOn={routeHere}
          route={route}
          routeLoading={routeLoading}
          routeError={routeError}
          routeMode={routeMode}
          onRouteMode={(m) => {
            setRouteMode(m);
            setRouteLoading(true);
          }}
          onRouteHere={() => {
            const b = detail.business;
            setRouteHere(true);
            setRouteKeys([]);
            setRoute(null);
            setRouteError(null);
            setRouteLoading(true);
            setRouteStops([{ id: b.id, name: b.name, lat: b.lat, lng: b.lng }]);
          }}
          onRouteClear={() => {
            setRouteHere(false);
            setRouteStops(null);
            setRoute(null);
          }}
        />
      )}

      <div className="px-4 pt-3 empty:hidden">
        <AdList ads={ads} onOpenShop={(id, ad) => openShop(id, ad)} />
      </div>

      <nav className="sticky top-[calc(3.5rem+45dvh)] z-10 mt-1 flex gap-1 overflow-x-auto border-b border-slate-200 bg-[#FFFDF9] px-2 lg:top-0">
        {TABS.map((t) => {
          const Icon = TAB_ICONS[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-3 text-sm ${tab === t ? "border-asa-500 font-bold text-saga-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t}
              {t === "お気に入り" && favorites.length > 0 && <span className="text-xs text-slate-400">{favorites.length}</span>}
              {t === "お知らせ" && unread > 0 && <span className="rounded-full bg-coupon px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
            </button>
          );
        })}
        <Link href="/dashboard/customer/history" className="ml-auto shrink-0 px-3 py-3 text-sm text-slate-500 hover:text-slate-700">
          履歴・設定
        </Link>
      </nav>

      <section className="space-y-3 p-4">
        {(tab === "近く" || tab === "クーポン") && (
          <Filters
            radius={tab === "近く" ? radius : null}
            setRadius={setRadius}
            category={category}
            setCategory={setCategory}
            price={price}
            setPrice={setPrice}
          />
        )}

        {tab === "近く" && (
          <>
            <p className="text-sm text-slate-600">
              {RANGES.find((r) => r.value === radius)?.label ?? `${radius}m`} 以内に {nearby.length} 件
              （うちクーポン店 {nearby.filter((s) => s.best_discount).length} 件）
            </p>
            <ul className="space-y-2">
              {nearby.map((s) => (
                <li key={s.id}>
                  <button onClick={() => openShop(s.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.highlight ? "bg-coral-50 text-coupon" : "bg-saga-50 text-saga-600"}`}
                      aria-hidden
                    >
                      {s.has_photo ? <ShopPhoto shop={s} className="h-10 w-10 rounded-lg" /> : <CategoryIcon category={s.category} className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{s.name}</span>
                      <span className="text-xs text-slate-500">
                        {s.category} {PRICE_LEVEL_LABELS[s.price_level]}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-slate-600">
                      {travel[s.id]?.distance ?? formatDistance(s.distance_m)}
                      <br />
                      {travel[s.id]?.duration ?? `徒歩約${s.walk_minutes}分`}
                    </span>
                    {s.best_discount && (
                      <span className="shrink-0 rounded-md bg-coral-50 px-2 py-0.5 text-xs font-semibold text-coupon">{s.best_discount}%OFF</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === "お気に入り" && (
          <div className="space-y-2">
            {favorites.length === 0 && (
              <p className="card text-sm text-slate-600">
                まだお気に入りがありません。地図のピンやお店の一覧から、気になるお店の「お気に入り」を押して登録しましょう。
              </p>
            )}
            {favorites.map((f) => {
              const m = position ? haversineMeters(position, f) : null;
              return (
                <div key={f.id} className="card flex items-center gap-3">
                  <button onClick={() => openShop(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-saga-50 text-saga-600" aria-hidden>
                      <CategoryIcon category={f.category} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{f.name}</span>
                      <span className="block text-xs text-slate-500">
                        {m != null && `${formatDistance(m)}・徒歩約${estimateWalkMinutes(m)}分`}
                        {f.best_discount && <b className="ml-1 text-coupon">{f.best_discount}%OFF</b>}
                      </span>
                    </span>
                  </button>
                  <button onClick={() => showRoute([`shop-${f.id}`])} className="btn-primary shrink-0 px-3 py-1.5">
                    道順
                  </button>
                  <button onClick={() => toggleFavorite(f.id)} aria-label="お気に入りから外す" className="shrink-0 rounded-lg p-1.5 text-coupon hover:bg-coral-50">
                    <Heart className="h-5 w-5 fill-current" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "おすすめ" && (
          <div>
            <h2 className="mb-1 flex items-center gap-1.5 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-saga-600" aria-hidden />
              あなたへのおすすめ
            </h2>
            <p className="mb-4 text-xs text-slate-500">閲覧・クーポン利用の履歴、現在地、混雑度から AI が選びました。</p>
            <SwipeCards
              cards={recs}
              onSwipe={(card, liked) => liked && setSelectedId(card.id)}
              onOpen={(card) => (card.id === selectedId ? scrollToDetail() : setSelectedId(card.id))}
            />
          </div>
        )}

        {tab === "クーポン" && (
          <ul className="space-y-2">
            {coupons.length === 0 && <p className="text-sm text-slate-500">条件に合うクーポンはありません。</p>}
            {coupons.map((c) => (
              <li key={c.id} className="card flex items-center gap-3">
                {c.has_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/coupons/${c.id}/image`} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                )}
                <span className="shrink-0 text-2xl font-bold tabular-nums text-coupon">{c.discount_rate}%</span>
                <button onClick={() => openShop(c.business_id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-semibold">{c.title}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {c.business_name}
                    {c.distance_m != null && `・${formatDistance(c.distance_m)}`}・{new Date(c.expires_at).toLocaleDateString("ja-JP")}まで
                  </span>
                </button>
                <button onClick={() => redeemCoupon(c.id)} className="btn-primary shrink-0 px-3 py-1.5">
                  使う
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "ルート" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-600">行き先を選ぶと、現在地から<b>道に沿った</b>最適な順番のルートを表示します。</p>
              <div className="flex shrink-0 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
                {(["foot", "car"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setRouteMode(m);
                      if (routeStops) setRouteLoading(true);
                    }}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1 ${routeMode === m ? "bg-white text-saga-700 shadow-sm" : "text-slate-500"}`}
                  >
                    {m === "foot" ? <Footprints className="h-4 w-4" aria-hidden /> : <Car className="h-4 w-4" aria-hidden />}
                    {m === "foot" ? "徒歩" : "車"}
                  </button>
                ))}
              </div>
            </div>

            {routeLoading && <p className="text-sm font-medium text-saga-600">ルートを計算しています…</p>}
            {routeError && <p className="text-sm text-red-600">{routeError}</p>}
            {route && (
              <div className="card border-saga-300 ring-1 ring-saga-100">
                <p className="flex items-center gap-1.5 text-lg font-bold">
                  {route.mode === "WALKING" ? <Footprints className="h-5 w-5 text-saga-600" aria-hidden /> : <Car className="h-5 w-5 text-saga-600" aria-hidden />}
                  {route.mode === "WALKING" ? "徒歩" : "車"}で {formatDistance(route.totalMeters)}・約 {Math.max(1, Math.round(route.totalSeconds / 60))} 分
                </p>
                {route.estimated && (
                  <p className="text-xs text-amber-700">道順を取得できなかったため、直線距離からの目安を表示しています。</p>
                )}
                <ol className="mt-2 space-y-1.5 text-sm">
                  {route.legs.map((l, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        <b className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">{i + 1}</b>
                        {l.from} → {l.to}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {l.distance} / {l.duration}
                      </span>
                    </li>
                  ))}
                </ol>
                {route.provider === "osm" && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    道順データ ©{" "}
                    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
                      OpenStreetMap contributors
                    </a>
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-outline flex-1 lg:hidden">
                    地図で見る
                  </button>
                  <button
                    onClick={() => {
                      setRouteStops(null);
                      setRoute(null);
                      setRouteKeys([]);
                    }}
                    className="btn-outline"
                  >
                    クリア
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">道順：© OpenStreetMap contributors / FOSSGIS（OSRM）</p>
              </div>
            )}

            {stopGroups.map((g) =>
              g.items.length === 0 ? null : (
                <section key={g.title}>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <g.icon className="h-4 w-4 text-slate-400" aria-hidden />
                    {g.title}
                  </h3>
                  <ul className="space-y-2">
                    {g.items.map((s) => {
                      const m = position ? haversineMeters(position, s) : null;
                      const checked = routeKeys.includes(s.key);
                      return (
                        <li key={s.key}>
                          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-3 ${checked ? "border-saga-500 ring-1 ring-saga-500" : "border-slate-200 hover:bg-slate-50"}`}>
                            <input
                              type="checkbox"
                              className="h-5 w-5 accent-saga-600"
                              checked={checked}
                              onChange={() =>
                                setRouteKeys((ks) => (ks.includes(s.key) ? ks.filter((k) => k !== s.key) : [...ks, s.key].slice(0, 9)))
                              }
                            />
                            <span className="flex-1 font-medium">{s.name}</span>
                            {m != null && <span className="shrink-0 text-xs text-slate-500">{formatDistance(m)}</span>}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
            )}

            <div className="sticky bottom-3 z-10 lg:bottom-4">
              <button disabled={routeKeys.length === 0} onClick={() => showRoute(routeKeys)} className="btn-primary w-full py-3 text-base">
                {routeKeys.length ? `${routeKeys.length} か所を回るルートを表示` : "行き先を選んでください"}
              </button>
            </div>
          </div>
        )}

        {tab === "お知らせ" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">新着クーポン・お店のお知らせを毎週金曜日にメールでもお届けします（設定は「履歴・設定」ページ）。</p>
              {unread > 0 && (
                <button
                  className="text-xs text-saga-600 underline"
                  onClick={() =>
                    api("/api/notifications", { method: "PATCH" }).then(() =>
                      setNotifications((ns) => ns.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))),
                    )
                  }
                >
                  すべて既読
                </button>
              )}
            </div>
            {notifications.length === 0 && <p className="text-sm text-slate-500">お知らせはまだありません。</p>}
            {notifications.map((n) => (
              <div key={n.id} className={`card ${n.read_at ? "" : "border-l-4 border-l-saga-600"}`}>
                <p className="text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString("ja-JP")}</p>
                <p className="font-semibold">{n.title}</p>
                <p className="whitespace-pre-line text-sm text-slate-600">{n.body}</p>
                {n.link && (
                  <Link href={n.link} className="mt-1 inline-block text-sm text-saga-600 underline">
                    詳しく見る
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </main>
  );
}

/** 店舗詳細までスクロール（パソコンでは左の一覧パネルの中だけを動かす） */
const scrollToDetail = () => scrollToElement("shop-detail", "customer-panel");

function Filters(props: {
  radius: number | null;
  setRadius: (v: number) => void;
  category: string;
  setCategory: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {props.radius != null && (
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button key={r.value} onClick={() => props.setRadius(r.value)} className={props.radius === r.value ? "chip-on" : "chip-off"}>
              {r.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <select value={props.category} onChange={(e) => props.setCategory(e.target.value)} className="input py-1.5 text-sm">
          <option value="">すべての業種</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={props.price} onChange={(e) => props.setPrice(e.target.value)} className="input w-40 py-1.5 text-sm">
          <option value="">価格帯</option>
          <option value="1">¥〜1,000</option>
          <option value="2">¥1,000〜3,000</option>
          <option value="3">¥3,000〜</option>
        </select>
      </div>
    </div>
  );
}

function ShopDetail({
  detail,
  ad,
  travel,
  onClose,
  onRedeemCoupon,
  isFavorite,
  onToggleFavorite,
  onRouteHere,
  routeOn,
  route,
  routeLoading,
  routeError,
  routeMode,
  onRouteMode,
  onRouteClear,
}: {
  detail: Detail;
  ad: Ad | null;
  travel?: string;
  onClose: () => void;
  onRedeemCoupon: (id: number) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onRouteHere: () => void;
  routeOn: boolean;
  route: RouteSummary | null;
  routeLoading: boolean;
  routeError: string | null;
  routeMode: "foot" | "car";
  onRouteMode: (m: "foot" | "car") => void;
  onRouteClear: () => void;
}) {
  const b = detail.business;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking`;
  return (
    <div id="shop-detail" className="border-b border-slate-100 bg-white p-4 [scroll-margin-top:calc(3.5rem+45dvh+8px)] lg:[scroll-margin-top:0]">
      {ad && (
        <div className="mb-3">
          <AdDetail ad={ad} />
        </div>
      )}
      {b.has_photo && <ShopPhoto shop={b} className="mb-3 h-44 w-full rounded-xl" />}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <CategoryIcon category={b.category} className="h-3.5 w-3.5" />
            {b.category} {PRICE_LEVEL_LABELS[b.price_level]}
          </p>
          <h2 className="font-mincho text-xl font-bold">{b.name}</h2>
        </div>
        <button onClick={onClose} aria-label="閉じる" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <p className="text-sm text-slate-600">{b.service_description}</p>
      <p className="mt-1 text-xs text-slate-500">
        {b.address}
        {travel && `・${travel}`}
        {b.contact && `・${b.contact}`}
      </p>
      {detail.coupons.map((c) => (
        <CouponRow
          key={c.id}
          coupon={c}
          action={
            <button onClick={() => onRedeemCoupon(c.id)} className="btn-primary shrink-0 px-3 py-1.5">
              使う
            </button>
          }
        />
      ))}
      <div className="mt-3 flex gap-2">
        {!routeOn && (
          <button onClick={onRouteHere} className="btn-accent flex-1">
            <Navigation className="h-4 w-4" aria-hidden />
            経路を表示
          </button>
        )}
        <button onClick={onToggleFavorite} className={`btn-outline ${isFavorite ? "border-coral-100 text-coupon" : ""}`} aria-pressed={isFavorite}>
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} aria-hidden />
          お気に入り
        </button>
      </div>
      {routeOn && (
        <RouteBox route={route} loading={routeLoading} error={routeError} mode={routeMode} onMode={onRouteMode} onClear={onRouteClear} />
      )}
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <a href={directions} target="_blank" rel="noreferrer" className="text-saga-600 underline">
          Google マップで開く
        </a>
        {b.instagram_url && (
          <a href={b.instagram_url} target="_blank" rel="noreferrer" className="text-saga-600 underline">
            Instagram
          </a>
        )}
        {b.twitter_url && (
          <a href={b.twitter_url} target="_blank" rel="noreferrer" className="text-saga-600 underline">
            X（Twitter）
          </a>
        )}
      </div>
    </div>
  );
}

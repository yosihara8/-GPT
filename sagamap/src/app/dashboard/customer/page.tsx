"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView, { type HeatPoint, type MapSpot, type RouteSummary } from "@/components/MapView";
import AdBanner from "@/components/AdBanner";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import LocationAccuracy from "@/components/LocationAccuracy";
import SwipeCards, { type RecCard } from "@/components/SwipeCards";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDistanceMatrix } from "@/hooks/useDistanceMatrix";
import { api } from "@/lib/fetcher";
import { CATEGORIES, PRICE_LEVEL_LABELS, categoryEmoji } from "@/lib/config";
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
};
type Detail = {
  business: NearbyShop & { service_description: string; contact: string; instagram_url: string | null; twitter_url: string | null };
  coupons: Coupon[];
};
type Notification = { id: number; title: string; body: string; link: string | null; created_at: string; read_at: string | null };

const RANGES = [
  { label: "3km", value: 3000 },
  { label: "5km", value: 5000 },
  { label: "8km", value: 8000 },
];
const TABS = ["近く", "お気に入り", "おすすめ", "クーポン", "ルート", "お知らせ"] as const;
const TAB_ICONS: Record<string, string> = { 近く: "📍", お気に入り: "❤️", おすすめ: "✨", クーポン: "🎟️", ルート: "🗺️", お知らせ: "🔔" };

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
      { title: "❤️ お気に入り", items: byDist(favorites).map(shop) },
      { title: "📍 近くのお店", items: nearby.filter((n) => !favIds.has(n.id)).slice(0, 10).map(shop) },
      { title: "⭐ 観光名所", items: byDist(spots).map((s) => ({ ...s, key: `spot-${s.id}` })) },
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
    setTab("ルート");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    loadFavorites();
    api<{ spots: MapSpot[] }>("/api/spots").then((d) => setSpots(d.spots));
    api<{ notifications: Notification[] }>("/api/notifications").then((d) => setNotifications(d.notifications));
  }, [loadFavorites]);

  // 店舗詳細（閲覧履歴として記録され、AI 推薦に反映される）
  useEffect(() => {
    if (!selectedId) return setDetail(null);
    api<Detail>(`/api/businesses/${selectedId}`).then(setDetail);
  }, [selectedId]);

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
    <main className="mx-auto max-w-3xl">
      <div className="relative">
        <AdBanner onSelect={setSelectedId} />
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
          onSelectShop={setSelectedId}
          className="h-[60vh]"
        />
        <div className="absolute bottom-3 right-3 flex flex-col gap-2">
          <button onClick={toggleFlow} className={`rounded-full px-3 py-2 text-xs font-medium shadow ${flow ? "bg-saga-600 text-white" : "bg-white"}`}>
            人の流れ
          </button>
          <button onClick={locate} className="rounded-full bg-white px-3 py-2 text-xs font-medium shadow">
            現在地
          </button>
        </div>
      </div>

      {flow && (
        <div className="flex items-center gap-3 border-b bg-white px-4 py-2 text-sm">
          <span className="shrink-0 text-slate-600">{flowHour}時台の利用者の流れ（実測）</span>
          <input type="range" min={0} max={23} value={flowHour} onChange={(e) => setFlowHour(Number(e.target.value))} className="w-full accent-saga-600" />
        </div>
      )}

      <div className="space-y-2 px-4 pt-3 empty:hidden">
        <VerifyEmailBanner />
        <LocationAccuracy status={status} accuracy={accuracy} />
      </div>
      {isFallback && (
        <p className="bg-amber-50 px-4 py-2 text-xs text-amber-800">位置情報が取得できないため、佐賀駅を現在地としています。</p>
      )}
      {message && (
        <p className="bg-saga-50 px-4 py-2 text-sm text-saga-700" onClick={() => setMessage(null)}>
          {message}
        </p>
      )}

      {detail && (
        <ShopDetail
          detail={detail}
          travel={travel[detail.business.id]?.duration}
          onClose={() => setSelectedId(null)}
          onRedeemCoupon={redeemCoupon}
          isFavorite={favIds.has(detail.business.id)}
          onToggleFavorite={() => toggleFavorite(detail.business.id)}
          onRouteHere={() => showRoute([`shop-${detail.business.id}`])}
        />
      )}

      <nav className="sticky top-14 z-20 flex gap-1 overflow-x-auto border-b bg-white px-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm ${tab === t ? "border-saga-600 font-semibold text-saga-700" : "border-transparent text-slate-500"}`}
          >
            {TAB_ICONS[t]} {t}
            {t === "お気に入り" && favorites.length > 0 && <span className="ml-1 text-xs text-slate-400">{favorites.length}</span>}
            {t === "お知らせ" && unread > 0 && <span className="ml-1 rounded-full bg-coupon px-1.5 text-[10px] text-white">{unread}</span>}
          </button>
        ))}
        <Link href="/dashboard/customer/history" className="ml-auto shrink-0 px-3 py-3 text-sm text-slate-500">
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
                  <button onClick={() => setSelectedId(s.id)} className="card flex w-full items-center gap-3 text-left">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ring-4 ${s.highlight ? "bg-coral-50 ring-coupon/40" : "bg-saga-50 ring-shop/30"}`}
                      aria-hidden
                    >
                      {categoryEmoji(s.category)}
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
                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-coupon">{s.best_discount}%OFF</span>
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
                まだお気に入りがありません。地図のピンやお店の一覧から、気になるお店の「🤍 お気に入り」を押して登録しましょう。
              </p>
            )}
            {favorites.map((f) => {
              const m = position ? haversineMeters(position, f) : null;
              return (
                <div key={f.id} className="card flex items-center gap-3">
                  <button onClick={() => setSelectedId(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-lg" aria-hidden>
                      {categoryEmoji(f.category)}
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
                  <button onClick={() => toggleFavorite(f.id)} aria-label="お気に入りから外す" className="shrink-0 text-xl">
                    ❤️
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "おすすめ" && (
          <div>
            <h2 className="mb-1 text-lg font-extrabold">✨ あなたへのおすすめ</h2>
            <p className="mb-4 text-xs text-slate-500">閲覧・クーポン利用の履歴、現在地、混雑度から AI が選びました。</p>
            <SwipeCards
              cards={recs}
              onSwipe={(card, liked) => liked && setSelectedId(card.id)}
              onOpen={(card) => setSelectedId(card.id)}
            />
          </div>
        )}

        {tab === "クーポン" && (
          <ul className="space-y-2">
            {coupons.length === 0 && <p className="text-sm text-slate-500">条件に合うクーポンはありません。</p>}
            {coupons.map((c) => (
              <li key={c.id} className="card flex items-center gap-3">
                <span className="shrink-0 text-2xl font-black text-coupon">{c.discount_rate}%</span>
                <button onClick={() => setSelectedId(c.business_id)} className="min-w-0 flex-1 text-left">
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
              <div className="flex shrink-0 rounded-full bg-slate-100 p-1 text-sm font-bold">
                {(["foot", "car"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setRouteMode(m);
                      if (routeStops) setRouteLoading(true);
                    }}
                    className={`rounded-full px-3 py-1 ${routeMode === m ? "bg-white text-saga-700 shadow" : "text-slate-500"}`}
                  >
                    {m === "foot" ? "🚶 徒歩" : "🚗 車"}
                  </button>
                ))}
              </div>
            </div>

            {routeLoading && <p className="text-sm font-bold text-saga-600">🗺️ ルートを計算しています…</p>}
            {routeError && <p className="text-sm text-red-600">{routeError}</p>}
            {route && (
              <div className="card border-2 border-tea-500">
                <p className="text-lg font-extrabold">
                  {route.mode === "WALKING" ? "🚶 徒歩" : "🚗 車"}で {formatDistance(route.totalMeters)}・約 {Math.max(1, Math.round(route.totalSeconds / 60))} 分
                </p>
                {route.estimated && (
                  <p className="text-xs text-amber-700">道順を取得できなかったため、直線距離からの目安を表示しています。</p>
                )}
                <ol className="mt-2 space-y-1.5 text-sm">
                  {route.legs.map((l, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        <b className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-tea-500 text-xs text-white">{i + 1}</b>
                        {l.from} → {l.to}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {l.distance} / {l.duration}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-outline flex-1">
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
                  <h3 className="mb-2 text-sm font-extrabold text-slate-700">{g.title}</h3>
                  <ul className="space-y-2">
                    {g.items.map((s) => {
                      const m = position ? haversineMeters(position, s) : null;
                      const checked = routeKeys.includes(s.key);
                      return (
                        <li key={s.key}>
                          <label className={`card flex items-center gap-3 py-3 ${checked ? "ring-2 ring-saga-500" : ""}`}>
                            <input
                              type="checkbox"
                              className="h-5 w-5 accent-saga-600"
                              checked={checked}
                              onChange={() =>
                                setRouteKeys((ks) => (ks.includes(s.key) ? ks.filter((k) => k !== s.key) : [...ks, s.key].slice(0, 9)))
                              }
                            />
                            <span className="flex-1 font-bold">{s.name}</span>
                            {m != null && <span className="shrink-0 text-xs text-slate-500">{formatDistance(m)}</span>}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
            )}

            <div className="sticky bottom-3 z-10">
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
              <div key={n.id} className={`card ${n.read_at ? "" : "border-saga-500"}`}>
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
    </main>
  );
}

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
  travel,
  onClose,
  onRedeemCoupon,
  isFavorite,
  onToggleFavorite,
  onRouteHere,
}: {
  detail: Detail;
  travel?: string;
  onClose: () => void;
  onRedeemCoupon: (id: number) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onRouteHere: () => void;
}) {
  const b = detail.business;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking`;
  return (
    <div className="border-b bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-saga-600">
            {b.category} {PRICE_LEVEL_LABELS[b.price_level]}
          </p>
          <h2 className="text-lg font-bold">{b.name}</h2>
        </div>
        <button onClick={onClose} aria-label="閉じる" className="text-xl text-slate-400">
          ×
        </button>
      </div>
      <p className="text-sm text-slate-600">{b.service_description}</p>
      <p className="mt-1 text-xs text-slate-500">
        {b.address}
        {travel && `・${travel}`}
        {b.contact && `・${b.contact}`}
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={onRouteHere} className="btn-primary flex-1">
          🗺️ ここへの道順
        </button>
        <button onClick={onToggleFavorite} className={`btn-outline ${isFavorite ? "border-coral-400 text-coupon" : ""}`}>
          {isFavorite ? "❤️ お気に入り" : "🤍 お気に入り"}
        </button>
      </div>
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
      {detail.coupons.map((c) => (
        <div key={c.id} className="mt-3 flex items-center gap-3 rounded-xl border-2 border-dashed border-coupon/50 bg-red-50 p-3">
          <span className="text-2xl font-black text-coupon">{c.discount_rate}%</span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold">{c.title}</span>
            <span className="text-xs text-slate-500">
              {c.conditions && `${c.conditions}・`}
              {new Date(c.expires_at).toLocaleDateString("ja-JP")}まで
            </span>
          </span>
          <button onClick={() => onRedeemCoupon(c.id)} className="btn-primary px-3 py-1.5">
            使う
          </button>
        </div>
      ))}
    </div>
  );
}

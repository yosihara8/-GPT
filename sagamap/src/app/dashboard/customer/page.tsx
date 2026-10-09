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
import { CATEGORIES, PRICE_LEVEL_LABELS, WALK_10MIN_RADIUS_M, categoryEmoji } from "@/lib/config";
import { formatDistance } from "@/lib/geo";

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
  { label: "500m", value: 500 },
  { label: "徒歩10分", value: WALK_10MIN_RADIUS_M },
  { label: "3km", value: 3000 },
];
const TABS = ["近く", "おすすめ", "クーポン", "ルート", "お知らせ"] as const;
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
  const [radius, setRadius] = useState(WALK_10MIN_RADIUS_M);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [nearby, setNearby] = useState<NearbyShop[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(Number(params.get("shop")) || null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [recs, setRecs] = useState<RecCard[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [routeIds, setRouteIds] = useState<number[]>([]);
  const [routeStops, setRouteStops] = useState<MapSpot[] | null>(null);
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

  useEffect(() => {
    api<{ spots: MapSpot[] }>("/api/spots").then((d) => setSpots(d.spots));
    api<{ notifications: Notification[] }>("/api/notifications").then((d) => setNotifications(d.notifications));
  }, []);

  // 店舗詳細（閲覧履歴として記録され、AI 推薦に反映される）
  useEffect(() => {
    if (!selectedId) return setDetail(null);
    api<Detail>(`/api/businesses/${selectedId}`).then(setDetail);
  }, [selectedId]);

  // 時間帯別の観光客の流れ
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
  const sortedSpots = [...spots].sort(
    (a, b) => (travel[`spot-${a.id}`]?.seconds ?? Infinity) - (travel[`spot-${b.id}`]?.seconds ?? Infinity),
  );

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
          onRoute={(r, err) => {
            setRoute(r);
            setRouteError(err ?? null);
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
          <span className="shrink-0 text-slate-600">{flowHour}時台の観光客の流れ</span>
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
        />
      )}

      <nav className="sticky top-14 z-20 flex gap-1 overflow-x-auto border-b bg-white px-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm ${tab === t ? "border-saga-600 font-semibold text-saga-700" : "border-transparent text-slate-500"}`}
          >
            {{ 近く: "📍", おすすめ: "✨", クーポン: "🎟️", ルート: "🗺️", お知らせ: "🔔" }[t]} {t}
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
          <div className="space-y-3">
            <p className="text-sm text-slate-600">行きたい観光名所を選ぶと、現在地から最適な順番で回るルートを提案します。</p>
            <ul className="space-y-2">
              {sortedSpots.map((s) => (
                <li key={s.id}>
                  <label className="card flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-saga-600"
                      checked={routeIds.includes(s.id)}
                      onChange={() => setRouteIds((ids) => (ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id]))}
                    />
                    <span className="flex-1 font-medium">{s.name}</span>
                    <span className="text-xs text-slate-500">
                      {travel[`spot-${s.id}`]?.distance}
                      {travel[`spot-${s.id}`] && ` / ${travel[`spot-${s.id}`].duration}`}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                disabled={routeIds.length === 0}
                onClick={() => setRouteStops(spots.filter((s) => routeIds.includes(s.id)))}
                className="btn-primary flex-1"
              >
                ルートを提案
              </button>
              {routeStops && (
                <button
                  onClick={() => {
                    setRouteStops(null);
                    setRoute(null);
                  }}
                  className="btn-outline"
                >
                  クリア
                </button>
              )}
            </div>
            {routeError && <p className="text-sm text-red-600">{routeError}</p>}
            {route && (
              <div className="card">
                <p className="font-semibold">
                  {route.mode === "WALKING" ? "徒歩" : "車"}で合計 {formatDistance(route.totalMeters)}・約{" "}
                  {Math.round(route.totalSeconds / 60)} 分
                </p>
                <ol className="mt-2 space-y-1 text-sm">
                  {route.legs.map((l, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        {i + 1}. {l.from} → {l.to}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {l.distance} / {l.duration}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
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
        <select value={props.price} onChange={(e) => props.setPrice(e.target.value)} className="input w-32 py-1.5 text-sm">
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
}: {
  detail: Detail;
  travel?: string;
  onClose: () => void;
  onRedeemCoupon: (id: number) => void;
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
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <a href={directions} target="_blank" rel="noreferrer" className="text-saga-600 underline">
          Google マップで道順
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

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import MapView, { isHighlighted, type MapShop, type MapSpot } from "@/components/MapView";
import AdBanner from "@/components/AdBanner";
import ShopPhoto from "@/components/ShopPhoto";
import LocationAccuracy from "@/components/LocationAccuracy";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CATEGORIES, COUPON_HIGHLIGHT_RADIUS_M, categoryEmoji } from "@/lib/config";
import { formatDistance, haversineMeters } from "@/lib/geo";

type Shop = MapShop & { address: string; service_description: string; has_photo?: boolean };

/** トップ: 店舗一覧の地図（会員登録なしで閲覧できる集客の入り口） */
export default function HomePage() {
  const { data: session } = useSession();
  const { position, accuracy, isFallback, status, locate } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);

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
    <main className="mx-auto max-w-5xl">
      {/* 表題 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-saga-500 via-saga-600 to-coral-500 px-4 pb-4 pt-5 text-white">
        <span className="pointer-events-none absolute -right-2 top-1 animate-float text-5xl opacity-90" aria-hidden>
          🎈
        </span>
        <span className="pointer-events-none absolute right-16 top-2 hidden animate-float text-3xl opacity-70 [animation-delay:1.2s] sm:block" aria-hidden>
          🎈
        </span>
        <p className="text-xs font-bold tracking-widest text-sun-300">SAGA × GEOSPATIAL × AI</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight drop-shadow sm:text-3xl">
          佐賀おでかけマップ
          <span className="ml-2 align-middle text-base font-bold opacity-90">SagaMap</span>
        </h1>
        <p className="mt-1 text-sm font-bold opacity-90">地元のお店と、まだ知らない佐賀へ。近くのクーポンを地図で見つけよう！</p>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            onClick={() => setCategory(null)}
            className={`chip ${category === null ? "border-white bg-white text-saga-700" : "border-white/50 bg-white/10 text-white"}`}
          >
            🗾 すべて
          </button>
          {CATEGORIES.filter((c) => shops.some((s) => s.category === c)).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? null : c)}
              className={`chip ${category === c ? "border-white bg-white text-saga-700" : "border-white/50 bg-white/10 text-white"}`}
            >
              {categoryEmoji(c)} {c}
            </button>
          ))}
        </div>
      </section>

      <div className="relative">
        <AdBanner onSelect={setSelectedId} />
        <MapView
          shops={visible}
          me={position}
          meAccuracy={accuracy}
          spots={spots}
          searchRadius={COUPON_HIGHLIGHT_RADIUS_M}
          selectedId={selectedId}
          onSelectShop={setSelectedId}
          className="h-[60vh]"
        />
        <button onClick={locate} className="absolute bottom-3 right-3 z-10 rounded-full bg-white px-4 py-2 text-sm font-bold text-saga-700 shadow-pop">
          📍 現在地
        </button>
      </div>

      <section className="space-y-4 p-4">
        <LocationAccuracy status={status} accuracy={accuracy} />
        {isFallback && (
          <p className="rounded-2xl bg-sun-100 px-4 py-2 text-xs font-bold text-amber-800">
            位置情報が取得できなかったため、佐賀駅を現在地として表示しています。
          </p>
        )}

        {selected ? (
          <div className="card overflow-hidden p-0">
            <ShopPhoto shop={selected} className="h-40 w-full" />
            <div className="p-4">
              <p className="text-xs font-bold text-saga-600">
                {categoryEmoji(selected.category)} {selected.category}
              </p>
              <h2 className="text-xl font-extrabold">{selected.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{selected.service_description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {selected.address}
                {position && `・現在地から ${formatDistance(haversineMeters(position, selected))}`}
              </p>
              {selected.has_coupon && (
                <p className="mt-2 inline-block rounded-full bg-coral-50 px-3 py-1 text-sm font-extrabold text-coupon">🎟️ クーポン配信中</p>
              )}
              <Link
                href={isCustomer ? `/dashboard/customer?shop=${selected.id}` : `/shops/${selected.id}`}
                className="btn-primary mt-3 w-full"
              >
                {isCustomer ? "クーポン・道順を見る" : "店舗情報を確認する"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="card flex items-center gap-4">
            <span className="text-4xl" aria-hidden>
              🎟️
            </span>
            <div>
              <p className="font-bold">
                現在地から 500m 以内に
                <span className="mx-1 text-3xl font-extrabold text-coupon">{nearbyCoupons.length}</span>
                件のクーポン店
              </p>
              <p className="text-xs text-slate-500">
                {shops.length === 0 ? "掲載店舗を募集中です。お店の方はぜひ無料で掲載してください！" : "ピンをタップすると店舗情報が表示されます。"}
              </p>
            </div>
          </div>
        )}

        {!session && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card border-t-4 border-t-coral-500">
              <p className="text-3xl" aria-hidden>🧳</p>
              <h3 className="mt-1 text-lg font-extrabold">観光で来た方</h3>
              <p className="mt-1 text-sm text-slate-600">クーポン検索・AI おすすめ・徒歩ルート案内が、無料の会員登録で使えます。</p>
              <Link href="/register/customer" className="btn-primary mt-3 w-full">
                無料で会員登録
              </Link>
            </div>
            <div className="card border-t-4 border-t-tea-500">
              <p className="text-3xl" aria-hidden>🏪</p>
              <h3 className="mt-1 text-lg font-extrabold">お店を営む方</h3>
              <p className="mt-1 text-sm text-slate-600">無料で 1 店舗を地図に掲載。有料プランでクーポン発行・広告出稿もできます。</p>
              <Link href="/register/business" className="btn-outline mt-3 w-full">
                店舗を無料で掲載
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

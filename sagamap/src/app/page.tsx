"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import MapView, { isHighlighted, type MapShop, type MapSpot } from "@/components/MapView";
import AdBanner from "@/components/AdBanner";
import { useGeolocation } from "@/hooks/useGeolocation";
import { COUPON_HIGHLIGHT_RADIUS_M } from "@/lib/config";
import { formatDistance, haversineMeters } from "@/lib/geo";

type Shop = MapShop & { address: string; service_description: string };

/** トップ: 店舗一覧の地図（会員登録なしで閲覧できる集客の入り口） */
export default function HomePage() {
  const { data: session } = useSession();
  const { position, isFallback, locate } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => setShops(d.businesses ?? []));
    fetch("/api/spots").then((r) => r.json()).then((d) => setSpots(d.spots ?? []));
  }, []);

  const nearbyCoupons = useMemo(
    () => shops.filter((s) => isHighlighted(s, position, COUPON_HIGHLIGHT_RADIUS_M)),
    [shops, position],
  );
  const selected = shops.find((s) => s.id === selectedId);
  const isCustomer = session?.user.role === "customer";

  return (
    <main className="mx-auto max-w-3xl">
      <div className="relative">
        <AdBanner onSelect={setSelectedId} />
        <MapView
          shops={shops}
          me={position}
          spots={spots}
          searchRadius={COUPON_HIGHLIGHT_RADIUS_M}
          selectedId={selectedId}
          onSelectShop={setSelectedId}
          className="h-[65vh]"
        />
        <button
          onClick={locate}
          className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-2 text-sm font-medium shadow"
        >
          現在地
        </button>
      </div>

      <section className="space-y-3 p-4">
        {isFallback && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            位置情報が取得できなかったため、佐賀駅を現在地として表示しています。
          </p>
        )}

        {selected ? (
          <div className="card">
            <p className="text-xs text-saga-600">{selected.category}</p>
            <h2 className="text-lg font-bold">{selected.name}</h2>
            <p className="text-sm text-slate-600">{selected.service_description}</p>
            <p className="mt-1 text-xs text-slate-500">
              {selected.address}
              {position && `・現在地から ${formatDistance(haversineMeters(position, selected))}`}
            </p>
            {selected.has_coupon && (
              <p className="mt-2 text-sm font-semibold text-coupon">クーポン配信中</p>
            )}
            <Link
              href={isCustomer ? `/dashboard/customer?shop=${selected.id}` : "/register/customer"}
              className="btn-primary mt-3 w-full"
            >
              {isCustomer ? "クーポン・徒歩ルートを見る" : "会員登録してクーポンを見る（無料）"}
            </Link>
          </div>
        ) : (
          <div className="card">
            <p className="text-sm">
              現在地から 500m 以内に
              <span className="mx-1 text-xl font-bold text-coupon">{nearbyCoupons.length}</span>
              件のクーポン店があります
            </p>
            <p className="mt-1 text-xs text-slate-500">ピンをタップすると店舗情報が表示されます。</p>
          </div>
        )}

        {!session && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card">
              <h3 className="font-bold">観光で来た方</h3>
              <p className="mt-1 text-sm text-slate-600">
                クーポン検索・AI おすすめ・徒歩ルート案内は無料の会員登録で使えます。
              </p>
              <Link href="/register/customer" className="btn-primary mt-3 w-full">
                無料で会員登録
              </Link>
            </div>
            <div className="card">
              <h3 className="font-bold">お店を営む方</h3>
              <p className="mt-1 text-sm text-slate-600">
                無料で 1 店舗を地図に掲載。有料プランでクーポン発行・広告出稿もできます。
              </p>
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

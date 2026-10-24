"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MapView, { type MapShop } from "@/components/MapView";
import { SAGA_CENTER } from "@/lib/config";

/**
 * 登録前の方が見られる地図（見るだけ）。ピンを押すと、そのお店の公開ページを開く。
 * 現在地・行き方・クーポンは会員だけ。
 */
export default function GuestMap() {
  const router = useRouter();
  const [shops, setShops] = useState<MapShop[]>([]);
  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((d) => setShops(d.businesses ?? []))
      .catch(() => setShops([]));
  }, []);
  return (
    <MapView
      shops={shops}
      center={SAGA_CENTER}
      zoom={10}
      highlightRadius={Number.POSITIVE_INFINITY}
      legend={false}
      onSelectShop={(id) => router.push(`/shops/${id}`)}
      className="h-[48vh] min-h-[300px]"
    />
  );
}

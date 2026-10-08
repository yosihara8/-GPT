"use client";

import { useEffect, useState } from "react";
import { useGoogleMaps } from "./useGoogleMaps";
import { estimateWalkMinutes, formatDistance, haversineMeters } from "@/lib/geo";

export type Travel = { distance: string; duration: string; seconds: number; estimated: boolean };
type Dest = { id: number | string; lat: number; lng: number };

/**
 * 現在地 → 各地点の徒歩距離・所要時間（Google Distance Matrix API）。
 * API が使えない場合は直線距離からの概算を返す。
 */
export function useDistanceMatrix(origin: { lat: number; lng: number } | null, dests: Dest[]) {
  const { ready } = useGoogleMaps();
  const [result, setResult] = useState<Record<string, Travel>>({});
  const key = dests.map((d) => d.id).join(",");

  useEffect(() => {
    if (!origin || dests.length === 0) return;
    const fallback: Record<string, Travel> = {};
    for (const d of dests) {
      const m = haversineMeters(origin, d);
      const min = estimateWalkMinutes(m);
      fallback[d.id] = { distance: formatDistance(m), duration: `徒歩約${min}分`, seconds: min * 60, estimated: true };
    }
    setResult(fallback);
    if (!ready || !google.maps.DistanceMatrixService) return;

    const service = new google.maps.DistanceMatrixService();
    let cancelled = false;
    // 1 リクエストあたりの目的地は 25 件まで
    for (let i = 0; i < dests.length; i += 25) {
      const chunk = dests.slice(i, i + 25);
      service
        .getDistanceMatrix({
          origins: [origin],
          destinations: chunk.map((d) => ({ lat: d.lat, lng: d.lng })),
          travelMode: google.maps.TravelMode.WALKING,
        })
        .then((res) => {
          if (cancelled) return;
          const next: Record<string, Travel> = {};
          res.rows[0]?.elements.forEach((el, j) => {
            if (el.status === "OK") {
              next[chunk[j].id] = {
                distance: el.distance.text,
                duration: `徒歩${el.duration.text}`,
                seconds: el.duration.value,
                estimated: false,
              };
            }
          });
          setResult((prev) => ({ ...prev, ...next }));
        })
        .catch(() => {
          /* 概算値のまま表示 */
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, origin?.lat, origin?.lng, key]);

  return result;
}

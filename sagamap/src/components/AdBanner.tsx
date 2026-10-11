"use client";

import { useEffect, useState } from "react";

type Ad = { id: number; headline: string; body: string; business_id: number; business_name: string };

/** 地図上部の広告バナー（有料プラン）。5 秒ごとに切り替え */
export default function AdBanner({ onSelect }: { onSelect?: (businessId: number) => void }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((d) => setAds(d.ads ?? []))
      .catch(() => setAds([]));
  }, []);
  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  const ad = ads[index];
  if (!ad) return null;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(ad.business_id)}
      className="absolute left-3 right-3 top-3 z-[500] flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-left shadow-pop backdrop-blur"
    >
      <span className="shrink-0 rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{ad.headline}</span>
        <span className="block truncate text-xs text-slate-600">
          {ad.business_name}
          {ad.body && ` ・ ${ad.body}`}
        </span>
      </span>
    </button>
  );
}

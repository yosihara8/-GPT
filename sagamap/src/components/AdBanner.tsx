"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

export type Ad = { id: number; headline: string; body: string; business_id: number; business_name: string; has_image?: boolean };

/** 地図上部の広告バナー（有料プラン）。5 秒ごとに切り替え */
export default function AdBanner({ onSelect }: { onSelect?: (businessId: number, ad: Ad) => void }) {
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
      onClick={() => onSelect?.(ad.business_id, ad)}
      aria-label={`広告：${ad.headline}（タップで詳しく見る）`}
      className="absolute left-3 right-3 top-3 z-[500] flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-left shadow-pop backdrop-blur"
    >
      {ad.has_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/ads/${ad.id}/image`} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
      )}
      <span className="shrink-0 rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{ad.headline}</span>
        <span className="block truncate text-xs text-slate-600">
          {ad.business_name}
          {ad.body && ` ・ ${ad.body}`}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

/** 広告をタップしたときに、お店の詳細の上に表示する広告の内容 */
export function AdDetail({ ad }: { ad: Ad }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {ad.has_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/ads/${ad.id}/image`} alt="" className="h-44 w-full object-cover" />
      )}
      <div className="p-3">
        <span className="rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
        <p className="mt-1.5 font-bold text-slate-900">{ad.headline}</p>
        {ad.body && <p className="mt-0.5 text-sm text-slate-600">{ad.body}</p>}
      </div>
    </div>
  );
}

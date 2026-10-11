"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Megaphone, Navigation } from "lucide-react";

export type Ad = {
  id: number;
  headline: string;
  body: string;
  business_id: number;
  business_name: string;
  has_image?: boolean;
  ends_at?: string;
};

/** 広告の表示・タップを記録する（事業主向けの統計。同じ人の重複はサーバー側で数えない） */
export function trackAd(id: number, kind: "view" | "click") {
  fetch(`/api/ads/${id}/event`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) }).catch(
    () => undefined,
  );
}

/** 配信中の広告（お客さまの画面で共通） */
export function useActiveAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((d) => setAds(d.ads ?? []))
      .catch(() => setAds([]));
  }, []);
  return ads;
}

/** 地図上部の広告バナー（有料プラン）。5 秒ごとに切り替え */
export default function AdBanner({ ads, onSelect }: { ads: Ad[]; onSelect?: (businessId: number, ad: Ad) => void }) {
  const [index, setIndex] = useState(0);
  const seen = useRef(new Set<number>());

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  const ad = ads[index];
  // 画面に表示された広告を「表示」として記録（この画面を開いている間は 1 広告 1 回）
  useEffect(() => {
    if (!ad || seen.current.has(ad.id) || document.visibilityState !== "visible") return;
    seen.current.add(ad.id);
    trackAd(ad.id, "view");
  }, [ad]);

  if (!ad) return null;
  return (
    <button
      type="button"
      onClick={() => {
        trackAd(ad.id, "click");
        onSelect?.(ad.business_id, ad);
      }}
      aria-label={`広告：${ad.headline}（タップで詳しく見る）`}
      className="absolute left-3 right-3 top-3 z-[500] flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-left shadow-pop backdrop-blur"
    >
      {ad.has_image && <img src={`/api/ads/${ad.id}/image`} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
      <span className="shrink-0 rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{ad.headline}</span>
        <span className="block truncate text-xs text-slate-600">
          {ad.business_name}
          {ad.body && ` ・ ${ad.body}`}
        </span>
      </span>
      <span className="flex shrink-0 items-center text-xs font-medium text-saga-600">
        詳しく
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}

/** 広告の詳細（写真・見出し・本文・お店の名前・掲載期限） */
export function AdDetail({ ad }: { ad: Ad }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {ad.has_image && <img src={`/api/ads/${ad.id}/image`} alt="" className="h-48 w-full object-cover" />}
      <div className="p-3">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
          {ad.business_name && <span className="font-medium text-slate-700">{ad.business_name} からのお知らせ</span>}
        </p>
        <p className="mt-1.5 text-base font-bold text-slate-900">{ad.headline}</p>
        {ad.body && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{ad.body}</p>}
        {ad.ends_at && <p className="mt-1 text-xs text-slate-400">{new Date(ad.ends_at).toLocaleDateString("ja-JP")} まで掲載</p>}
      </div>
    </div>
  );
}

/** お客さまの画面の「PR・お店からのお知らせ」一覧。タップでその場に詳細を表示 */
export function AdList({ ads, onOpenShop }: { ads: Ad[]; onOpenShop: (businessId: number, ad: Ad) => void }) {
  const [openId, setOpenId] = useState<number | null>(null);
  if (ads.length === 0) return null;
  return (
    <section className="pt-1">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Megaphone className="h-4 w-4 text-slate-400" aria-hidden />
        PR・お店からのお知らせ
      </h3>
      <ul className="space-y-2">
        {ads.map((ad) => {
          const open = openId === ad.id;
          return (
            <li key={ad.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                onClick={() => {
                  if (!open) trackAd(ad.id, "click");
                  setOpenId(open ? null : ad.id);
                }}
                aria-expanded={open}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"
              >
                {ad.has_image ? (
                  <img src={`/api/ads/${ad.id}/image`} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="shrink-0 rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{ad.headline}</span>
                  <span className="block truncate text-xs text-slate-500">{ad.business_name}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {open && (
                <div className="space-y-2 border-t border-slate-100 p-3">
                  <AdDetail ad={ad} />
                  <button onClick={() => onOpenShop(ad.business_id, ad)} className="btn-outline w-full">
                    <Navigation className="h-4 w-4" aria-hidden />
                    お店の情報・クーポン・経路を見る
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

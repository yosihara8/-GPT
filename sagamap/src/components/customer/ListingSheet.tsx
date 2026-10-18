"use client";

import { ArrowLeft, BedDouble, Bus, ExternalLink, Footprints, MapPin, Navigation, Phone, Store, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import MapView from "@/components/MapView";
import { LISTING_LABEL, travelText } from "./Cards";

export type Listing = { id: number; name: string; lat: number; lng: number; kind?: string; description?: string; area?: string; address?: string | null; tel?: string | null };

const ICON = { stay: BedDouble, transport: Bus, food: UtensilsCrossed } as const;

/**
 * 宿・交通・飲食の基本情報のページ（お店のページと同じ枠。画面いっぱい、パソコンは左側）。
 * 写真やクーポンは無く、名前・種類・住所・電話・地図と、行き方・電話への入口だけ。
 */
export default function ListingSheet({ listing, meters, onClose, onRoute }: { listing: Listing; meters: number | null; onClose: () => void; onRoute: () => void }) {
  const Icon = ICON[listing.kind as keyof typeof ICON] ?? Store;
  const label = LISTING_LABEL[listing.kind ?? ""] ?? "";
  const address = listing.address?.replace(/^佐賀県/, "佐賀県 ") ?? "";
  const gmap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.name} ${listing.address ?? ""}`)}`;
  const tel = listing.tel?.replace(/[^\d+]/g, "");

  return (
    <div
      className="fixed inset-0 z-[1500] flex flex-col bg-cream lg:inset-auto lg:bottom-0 lg:left-0 lg:top-14 lg:w-[480px] lg:border-r lg:border-slate-200 lg:shadow-[8px_0_24px_rgba(20,40,77,0.12)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${listing.name}の詳細`}
    >
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-slate-200/80 bg-[#FFFDF9]/95 px-2 backdrop-blur">
        <button onClick={onClose} className="flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-saga-600 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" aria-hidden />
          地図に戻る
        </button>
        <span className="min-w-0 flex-1 truncate pr-24 text-center text-sm font-bold text-slate-700">{listing.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-10">
        <section className="bg-white">
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-tea-50 via-white to-tea-100 text-tea-600">
            <Icon className="h-14 w-14" strokeWidth={1.2} aria-hidden />
          </div>
          <div className="px-5 pb-5 pt-4">
            <p className="text-xs font-bold tracking-wide text-tea-700">
              {label}
              {listing.area ? `・${listing.area}` : ""}
            </p>
            <h1 className="mt-1 text-[24px] font-bold leading-snug text-slate-900">{listing.name}</h1>
            {listing.description && <p className="mt-1 text-[15px] text-slate-600">{listing.description}</p>}
            {meters != null && (
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600">
                <Footprints className="h-4 w-4 text-saga-600" aria-hidden />
                現在地から {travelText(meters)}
              </p>
            )}
            <div className={`mt-4 grid gap-2 ${tel ? "grid-cols-2" : "grid-cols-1"}`}>
              <button onClick={onRoute} className="btn-accent rounded-full py-2.5">
                <Navigation className="h-4 w-4" aria-hidden />
                行き方を見る
              </button>
              {tel && (
                <a href={`tel:${tel}`} className="btn-outline rounded-full py-2.5">
                  <Phone className="h-4 w-4" aria-hidden />
                  電話する
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="mt-3 bg-white px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">基本情報</h2>
          <dl className="mt-2 divide-y divide-slate-100 text-sm">
            <div className="flex gap-3 py-2.5">
              <dt className="w-16 shrink-0 text-slate-500">種類</dt>
              <dd className="text-slate-800">{label}</dd>
            </div>
            {address && (
              <div className="flex gap-3 py-2.5">
                <dt className="w-16 shrink-0 text-slate-500">住所</dt>
                <dd className="text-slate-800">{address}</dd>
              </div>
            )}
            {listing.tel && (
              <div className="flex gap-3 py-2.5">
                <dt className="w-16 shrink-0 text-slate-500">電話</dt>
                <dd>
                  <a href={`tel:${tel}`} className="num font-bold text-saga-600 underline-offset-2 hover:underline">
                    {listing.tel}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="mt-3 bg-white px-5 py-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-saga-600" aria-hidden />
            地図
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <MapView shops={[]} spots={[listing]} center={listing} className="h-48" legend={false} layerToggle={false} />
          </div>
          <a href={gmap} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-saga-600">
            Google マップで開く
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </section>

        <div className="space-y-2 px-5 pt-4 text-xs leading-relaxed text-slate-500">
          <p>2023 年 3 月時点の公開資料にもとづく基本情報です。営業の状況や料金などは、各施設に直接ご確認ください。</p>
          <p>
            この施設の方へ：
            <Link href="/register/business" className="font-bold text-saga-600 underline underline-offset-2">
              無料の事業者登録
            </Link>
            をすると、写真・営業時間・クーポンを載せたお店のページに切り替わります。
          </p>
        </div>
      </div>
    </div>
  );
}

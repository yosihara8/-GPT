"use client";

import { Clock, ExternalLink, Heart, MapPin, Navigation, Phone, Share2, Ticket, X } from "lucide-react";
import ShopPhoto from "@/components/ShopPhoto";
import CategoryIcon from "@/components/CategoryIcon";
import CouponRow from "@/components/CouponRow";
import RouteBox from "@/components/RouteBox";
import { AdDetail, type Ad } from "@/components/AdBanner";
import type { RouteSummary } from "@/components/MapView";
import { PRICE_LEVEL_LABELS } from "@/lib/config";
import { travelText } from "./Cards";

export type SheetShop = {
  id: number;
  name: string;
  category: string;
  address?: string;
  lat: number;
  lng: number;
  service_description?: string;
  price_level?: number;
  contact?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  business_hours?: string | null;
  closed_days?: string | null;
  has_photo?: boolean;
  photo_version?: number | null;
};
export type SheetCoupon = { id: number; title: string; discount_rate: number; conditions?: string | null; expires_at: string; has_image?: boolean };

/** 電話番号らしい文字列なら、タップで電話をかけられるようにする */
const phoneOf = (s?: string | null) => {
  const m = s?.match(/0\d{1,4}-?\d{1,4}-?\d{3,4}/);
  return m ? m[0].replace(/-/g, "") : null;
};

/** お店の内容（写真・行動ボタン・営業時間・クーポン・経路）。同じページの中に表示する */
export default function ShopSheet({
  shop,
  coupons,
  ad,
  meters,
  favorite,
  routeOn,
  route,
  routeLoading,
  routeError,
  routeMode,
  onRoute,
  onRouteMode,
  onRouteClear,
  onFavorite,
  onUseCoupon,
  onClose,
}: {
  shop: SheetShop;
  coupons: SheetCoupon[] | null;
  ad: Ad | null;
  meters: number | null;
  favorite: boolean;
  routeOn: boolean;
  route: RouteSummary | null;
  routeLoading: boolean;
  routeError: string | null;
  routeMode: "foot" | "car";
  onRoute: () => void;
  onRouteMode: (m: "foot" | "car") => void;
  onRouteClear: () => void;
  onFavorite: () => void;
  onUseCoupon: (c: SheetCoupon) => void;
  onClose: () => void;
}) {
  const tel = phoneOf(shop.contact);
  const gmap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name} ${shop.address ?? ""}`)}`;
  async function share() {
    const url = `${location.origin}/shops/${shop.id}`;
    const data = { title: `${shop.name}｜佐賀観光マップ`, url };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        alert("リンクをコピーしました");
      }
    } catch {
      /* 共有をやめた場合は何もしない */
    }
  }

  const actions = [
    { label: routeOn ? "経路を表示中" : "経路", icon: Navigation, onClick: onRoute, primary: true },
    ...(tel ? [{ label: "電話", icon: Phone, href: `tel:${tel}` }] : []),
    { label: favorite ? "保存済み" : "保存", icon: Heart, onClick: onFavorite, on: favorite },
    { label: "共有", icon: Share2, onClick: share },
  ];

  return (
    <article id="shop-card" className="mx-4 mt-3 overflow-hidden rounded-3xl bg-white shadow-[0_2px_4px_rgba(20,40,77,0.05),0_12px_32px_rgba(20,40,77,0.12)] ring-1 ring-slate-200/70 [scroll-margin-top:calc(3.5rem+42dvh+8px)] lg:[scroll-margin-top:12px]">
      {ad && (
        <div className="p-3 pb-0">
          <AdDetail ad={ad} />
        </div>
      )}
      <div className="relative">
        {shop.has_photo && <ShopPhoto shop={shop} className="h-44 w-full" />}
        <button onClick={onClose} aria-label="閉じる" className="absolute right-3 top-3 rounded-full bg-white/95 p-1.5 text-slate-600 shadow">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="p-4">
        <p className="flex items-center gap-1.5 pr-10 text-xs font-medium text-slate-500">
          <CategoryIcon category={shop.category} className="h-3.5 w-3.5" />
          {shop.category}
          {shop.price_level ? `・${PRICE_LEVEL_LABELS[shop.price_level]}` : ""}
          {meters != null && `・${travelText(meters)}`}
        </p>
        <h2 className="mt-1 pr-10 font-mincho text-[22px] font-bold leading-snug text-slate-900">{shop.name}</h2>
        {shop.service_description && <p className="mt-1 text-sm text-slate-600">{shop.service_description}</p>}

        {/* よく使う操作（Google マップと同じく、1 タップで） */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {actions.map((a) => {
            const cls = `flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-bold ${a.primary ? "bg-asa-500 text-white" : "bg-slate-50 text-saga-600"}`;
            const inner = (
              <>
                <a.icon className={`h-5 w-5 ${"on" in a && a.on ? "fill-coupon text-coupon" : ""}`} aria-hidden />
                {a.label}
              </>
            );
            return "href" in a ? (
              <a key={a.label} href={a.href} className={cls}>
                {inner}
              </a>
            ) : (
              <button key={a.label} onClick={a.onClick} className={cls} aria-pressed={"on" in a ? a.on : undefined}>
                {inner}
              </button>
            );
          })}
        </div>

        {routeOn && (
          <RouteBox route={route} loading={routeLoading} error={routeError} mode={routeMode} onMode={onRouteMode} onClear={onRouteClear} />
        )}

        {/* クーポン */}
        {coupons && coupons.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-1 text-sm font-bold text-coupon">
              <Ticket className="h-4 w-4" aria-hidden />
              使えるクーポン
            </p>
            {coupons.map((c) => (
              <CouponRow
                key={c.id}
                coupon={c}
                action={
                  <button onClick={() => onUseCoupon(c)} className="btn-primary shrink-0 rounded-full px-4 py-1.5">
                    使う
                  </button>
                }
              />
            ))}
          </div>
        )}

        {/* 基本情報 */}
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
          {(shop.business_hours || shop.closed_days) && (
            <div className="flex gap-2">
              <dt className="shrink-0 pt-0.5 text-slate-400">
                <Clock className="h-4 w-4" aria-label="営業時間" />
              </dt>
              <dd className="text-slate-700">
                {shop.business_hours && <span className="block">{shop.business_hours}</span>}
                {shop.closed_days && <span className="block text-slate-500">定休日：{shop.closed_days}</span>}
              </dd>
            </div>
          )}
          {shop.address && (
            <div className="flex gap-2">
              <dt className="shrink-0 pt-0.5 text-slate-400">
                <MapPin className="h-4 w-4" aria-label="住所" />
              </dt>
              <dd>
                <a href={gmap} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2">
                  {shop.address}
                </a>
              </dd>
            </div>
          )}
          {shop.contact && (
            <div className="flex gap-2">
              <dt className="shrink-0 pt-0.5 text-slate-400">
                <Phone className="h-4 w-4" aria-label="連絡先" />
              </dt>
              <dd>
                {tel ? (
                  <a href={`tel:${tel}`} className="font-bold text-saga-600">
                    {shop.contact}
                  </a>
                ) : (
                  <span className="text-slate-700">{shop.contact}</span>
                )}
              </dd>
            </div>
          )}
        </dl>
        {(shop.instagram_url || shop.twitter_url) && (
          <p className="mt-3 flex gap-4 text-sm">
            {shop.instagram_url && (
              <a href={shop.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-saga-600">
                Instagram
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            {shop.twitter_url && (
              <a href={shop.twitter_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-saga-600">
                X（Twitter）
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </p>
        )}
      </div>
    </article>
  );
}

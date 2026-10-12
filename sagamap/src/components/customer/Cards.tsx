"use client";

/* eslint-disable @next/next/no-img-element */
import { Heart, Landmark, MapPin } from "lucide-react";
import ShopPhoto from "@/components/ShopPhoto";
import CategoryIcon from "@/components/CategoryIcon";
import { estimateWalkMinutes, formatDistance } from "@/lib/geo";
import type { Ad } from "@/components/AdBanner";

/** 距離と所要時間（2.5km までは徒歩、それより遠いと車の目安） */
export function travelText(m: number | null) {
  if (m == null) return "";
  if (m <= 2500) return `${formatDistance(m)}・徒歩${estimateWalkMinutes(m)}分`;
  return `${formatDistance(m)}・車で${Math.max(1, Math.round(m / 500))}分`;
}

export type CardShop = {
  id: number;
  name: string;
  category: string;
  has_photo?: boolean;
  photo_version?: number | null;
  best_discount?: number | null;
  has_coupon?: boolean;
};

/** お店のカード（写真・割引率・距離） */
export function ShopCard({
  shop,
  meters,
  note,
  favorite,
  onOpen,
  onFavorite,
}: {
  shop: CardShop;
  meters: number | null;
  note?: string;
  favorite?: boolean;
  onOpen: () => void;
  onFavorite?: () => void;
}) {
  const discount = shop.best_discount ?? 0;
  return (
    <div className="relative w-[172px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(20,40,77,0.05),0_6px_16px_rgba(20,40,77,0.08)] ring-1 ring-slate-200/70 sm:w-[196px]">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative h-[104px] bg-gradient-to-br from-saga-50 to-[#F3E6D2]">
          <ShopPhoto shop={shop} className="h-full w-full" />
          {discount > 0 && (
            <span className="absolute left-2 top-2 rounded-lg bg-coupon px-2 py-0.5 text-white shadow">
              <span className="num text-base font-extrabold leading-none">{discount}</span>
              <span className="num text-[10px] font-bold">%OFF</span>
            </span>
          )}
        </div>
        <div className="p-2.5">
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <CategoryIcon category={shop.category} className="h-3 w-3" />
            {shop.category}
          </p>
          <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-slate-900">{shop.name}</p>
          <p className="mt-1 flex items-center gap-0.5 truncate text-[11px] text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            {travelText(meters) || "　"}
          </p>
          {note && <p className="mt-1 truncate text-[11px] font-bold text-saga-600">{note}</p>}
        </div>
      </button>
      {onFavorite && (
        <button
          onClick={onFavorite}
          aria-label={favorite ? "お気に入りから外す" : "お気に入りに追加"}
          aria-pressed={favorite}
          className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow"
        >
          <Heart className={`h-4 w-4 ${favorite ? "fill-coupon text-coupon" : "text-slate-500"}`} aria-hidden />
        </button>
      )}
    </div>
  );
}

export type CardCoupon = {
  id: number;
  title: string;
  discount_rate: number;
  expires_at: string;
  business_id: number;
  business_name: string;
  distance_m: number | null;
};

/** クーポンのカード（小さなチケット） */
export function CouponCard({ coupon: c, onOpen }: { coupon: CardCoupon; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-[264px] shrink-0 snap-start items-stretch overflow-hidden rounded-2xl bg-white text-left shadow-[0_1px_2px_rgba(20,40,77,0.05),0_6px_16px_rgba(20,40,77,0.08)] ring-1 ring-slate-200/70"
    >
      <span className="relative flex w-[78px] shrink-0 flex-col items-center justify-center bg-coupon text-white">
        <span className="num text-[26px] font-extrabold leading-none">
          {c.discount_rate}
          <span className="text-sm">%</span>
        </span>
        <span className="num mt-1 text-[10px] font-bold tracking-[0.2em]">OFF</span>
        <span className="absolute -right-[5px] top-0 h-full w-[10px] bg-[radial-gradient(circle,#fff_3px,transparent_3.5px)] bg-[length:10px_12px] bg-repeat-y" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 py-2.5 pl-4 pr-3">
        <span className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{c.title}</span>
        <span className="mt-1 block truncate text-xs text-slate-600">{c.business_name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-400">
          {travelText(c.distance_m)}
          {c.distance_m != null && "・"}
          {new Date(c.expires_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}まで
        </span>
      </span>
    </button>
  );
}

/** PR（お店からのお知らせ）のカード */
export function AdCard({ ad, onOpen }: { ad: Ad; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-[0_1px_2px_rgba(20,40,77,0.05),0_6px_16px_rgba(20,40,77,0.08)] ring-1 ring-slate-200/70"
    >
      <div className="relative h-[108px] bg-gradient-to-br from-asa-50 to-sun-100">
        {ad.has_image && <img src={`/api/ads/${ad.id}/image`} alt="" className="h-full w-full object-cover" loading="lazy" />}
        <span className="absolute left-2 top-2 rounded border border-white/70 bg-white/90 px-1.5 py-px text-[10px] font-bold tracking-wide text-slate-600">PR</span>
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{ad.headline}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{ad.business_name}</p>
      </div>
    </button>
  );
}

/** 観光スポットのカード */
export function SpotCard({ name, description, meters, onOpen }: { name: string; description?: string; meters: number | null; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-[200px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-[0_1px_2px_rgba(20,40,77,0.05),0_6px_16px_rgba(20,40,77,0.08)] ring-1 ring-slate-200/70"
    >
      <div className="flex h-[72px] items-center justify-center bg-gradient-to-br from-sun-100 to-[#F3E6D2] text-sun-500">
        <Landmark className="h-8 w-8" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-bold text-slate-900">{name}</p>
        {description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{description}</p>}
        <p className="mt-1 truncate text-[11px] text-slate-500">{travelText(meters)}</p>
      </div>
    </button>
  );
}

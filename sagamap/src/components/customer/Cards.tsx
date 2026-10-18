"use client";

/* eslint-disable @next/next/no-img-element */
import { BedDouble, Bus, Heart, Landmark, MapPin, Phone, UtensilsCrossed } from "lucide-react";
import ShopPhoto from "@/components/ShopPhoto";
import CategoryIcon from "@/components/CategoryIcon";
import { estimateWalkMinutes, formatDistance } from "@/lib/geo";
import type { Ad } from "@/components/AdBanner";
import { daysLeft } from "@/lib/open-status";
import { CouponStub } from "@/components/CouponRow";
import AreaTag from "./AreaTag";
import { remainingUses, type CouponValue } from "@/lib/coupon";

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
  cover_photo_id?: number | null;
  best_discount?: number | null;
  best_label?: string | null;
  has_coupon?: boolean;
  address?: string | null;
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
  const label = shop.best_label ?? (shop.best_discount ? `${shop.best_discount}%OFF` : null);
  return (
    <div className="relative w-[176px] shrink-0 snap-start sm:w-[204px]">
      <button onClick={onOpen} className="group block w-full text-left">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-mizu-100">
          <ShopPhoto shop={shop} className="h-full w-full transition duration-300 group-hover:scale-[1.03]" />
          {label && <span className="num absolute left-0 top-3 rounded-r-full bg-coupon py-0.5 pl-2 pr-2.5 text-[13px] font-extrabold text-white">{label}</span>}
        </div>
        <p className="mt-2.5 line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">{shop.name}</p>
        <AreaTag address={shop.address} className="mt-1.5" />
        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500">
          <CategoryIcon category={shop.category} className="h-3 w-3 shrink-0" />
          {shop.category}
          {meters != null && <span className="truncate">・{travelText(meters)}</span>}
        </p>
        {note && <p className="mt-1 truncate text-[11px] font-bold text-saga-600">{note}</p>}
      </button>
      {onFavorite && (
        <button
          onClick={onFavorite}
          aria-label={favorite ? "お気に入りから外す" : "お気に入りに追加"}
          aria-pressed={favorite}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 ring-1 ring-slate-200"
        >
          <Heart className={`h-4 w-4 ${favorite ? "fill-coupon text-coupon" : "text-slate-600"}`} aria-hidden />
        </button>
      )}
    </div>
  );
}

export type CardCoupon = CouponValue & {
  id: number;
  title: string;
  expires_at: string;
  business_id: number;
  business_name: string;
  distance_m: number | null;
  max_uses?: number | null;
  used_count?: number | null;
  repeatable?: boolean | null;
  first_visit_only?: boolean | null;
  event_title?: string | null;
};

/** クーポンのカード（小さなチケット。種類ごとに色が変わる） */
export function CouponCard({ coupon: c, onOpen }: { coupon: CardCoupon; onOpen: () => void }) {
  const left = daysLeft(c.expires_at);
  const remain = remainingUses(c);
  return (
    <button
      onClick={onOpen}
      className="flex w-[272px] shrink-0 snap-start items-stretch overflow-hidden rounded-xl bg-white text-left ring-1 ring-slate-200"
    >
      <CouponStub coupon={c} />
      <span className="min-w-0 flex-1 py-2.5 pl-4 pr-3">
        {c.event_title && (
          <span className="mb-0.5 block truncate text-[10px] font-bold text-asa-600">{c.event_title} 限定</span>
        )}
        <span className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{c.title}</span>
        {c.coupon_type === "gift" && c.benefit && <span className="block truncate text-xs font-bold text-tea-700">{c.benefit}</span>}
        <span className="mt-0.5 block truncate text-xs text-slate-600">{c.business_name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-400">
          {travelText(c.distance_m)}
          {c.distance_m != null && "・"}
          {new Date(c.expires_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}まで
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className="flex gap-1">
            {left && <b className="rounded-full bg-coral-50 px-2 py-0.5 text-[10px] text-coupon">{left}</b>}
            {remain != null && remain > 0 && <b className="rounded-full bg-sun-100 px-2 py-0.5 text-[10px] text-sun-500">残り{remain}名</b>}
          </span>
          <span className="shrink-0 text-[11px] font-bold text-saga-600">詳しく見る ›</span>
        </span>
      </span>
    </button>
  );
}

/** PR（お店からのお知らせ）のカード */
export function AdCard({ ad, onOpen }: { ad: Ad; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group w-[240px] shrink-0 snap-start text-left">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-gradient-to-br from-asa-50 to-sun-100">
        {ad.has_image && <img src={`/api/ads/${ad.id}/image`} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />}
        <span className="absolute left-2 top-2 rounded border border-white/70 bg-white/90 px-1.5 py-px text-[10px] font-bold tracking-wide text-slate-600">PR</span>
      </div>
      <p className="mt-2.5 line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">{ad.headline}</p>
      {ad.body && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600">{ad.body}</p>}
      <p className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="truncate">{ad.business_name}</span>
        <span className="shrink-0 font-bold text-saga-600">詳しく見る ›</span>
      </p>
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

export const LISTING_LABEL: Record<string, string> = { stay: "宿", transport: "交通", food: "飲食・おみやげ" };
const LISTING_ICON = { stay: BedDouble, transport: Bus, food: UtensilsCrossed } as const;

/** 宿・交通・飲食の基本情報（名前・地域・電話）。押すと地図に行き方を出す */
export function ListingCard({
  name,
  kind,
  area,
  address,
  tel,
  meters,
  onOpen,
}: {
  name: string;
  kind: string;
  area?: string;
  address?: string | null;
  tel?: string | null;
  meters: number | null;
  onOpen: () => void;
}) {
  const Icon = LISTING_ICON[kind as keyof typeof LISTING_ICON] ?? BedDouble;
  return (
    <div className="w-[176px] shrink-0 snap-start sm:w-[204px]">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-tea-50 via-white to-mizu-100 text-tea-600 ring-1 ring-slate-100">
          <Icon className="h-9 w-9" strokeWidth={1.3} aria-hidden />
          <span className="text-[11px] font-bold tracking-[0.2em] text-tea-700">{LISTING_LABEL[kind] ?? ""}</span>
        </div>
        <p className="mt-2.5 line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">{name}</p>
        {address ? <AreaTag address={address} className="mt-1.5" /> : area ? <p className="mt-1.5 text-[11px] text-slate-500">{area}</p> : null}
        <p className="mt-1 truncate text-[11px] text-slate-500">{travelText(meters) || "タップで詳しく"}</p>
      </button>
      {tel && (
        <a href={`tel:${tel.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-saga-600">
          <Phone className="h-3.5 w-3.5" aria-hidden />
          <span className="num">{tel}</span>
        </a>
      )}
    </div>
  );
}

/** 佐賀の名物のカード（押すと説明を開く） */
export function SpecialtyCard({ name, area, note, onOpen }: { name: string; area: string; note: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-[164px] shrink-0 snap-start rounded-lg border-t-[3px] border-sun-400 bg-white p-3.5 text-left ring-1 ring-slate-200 hover:bg-slate-50">
      <p className="text-[10px] font-bold tracking-widest text-sun-500">{area}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{name}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{note}</p>
      <p className="mt-2 text-[11px] font-bold text-saga-600">詳しく見る ›</p>
    </button>
  );
}

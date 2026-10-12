"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  ExternalLink,
  Footprints,
  Heart,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Navigation,
  Phone,
  Share2,
  Store,
  Ticket,
  CalendarCheck,
  MessageCircle,
  Globe,
  UtensilsCrossed,
  BadgeCheck,
  Wallet,
} from "lucide-react";
import MapView from "@/components/MapView";
import ShopPhoto from "@/components/ShopPhoto";
import CategoryIcon from "@/components/CategoryIcon";
import { type Ad } from "@/components/AdBanner";
import Carousel from "./Carousel";
import { ShopCard, travelText, type CardShop } from "./Cards";
import { PRICE_LEVEL_LABELS } from "@/lib/config";
import { daysLeft, shopStatus } from "@/lib/open-status";
import { type SpecialDay } from "@/lib/schedule";
import HoursCard from "./HoursCard";
import PhotoSlider, { type SlidePhoto } from "./PhotoSlider";
import { paymentRows, paymentTags } from "@/lib/payment";
import { CouponStub, type CouponInfo } from "@/components/CouponRow";
import { couponBadge, couponRules, couponShort } from "@/lib/coupon";

export type DetailShop = CardShop & {
  lat: number;
  lng: number;
  address?: string;
  service_description?: string;
  price_level?: number;
  contact?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  threads_url?: string | null;
  facebook_url?: string | null;
  weekly_hours?: unknown;
  hours_note?: string | null;
  special_days?: SpecialDay[] | null;
  business_hours?: string | null;
  closed_days?: string | null;
  amenities?: string[] | null;
  payment_methods?: string[] | null;
  payment_none?: string[] | null;
  website_url?: string | null;
  reservation_url?: string | null;
  line_url?: string | null;
};
export type DetailCoupon = CouponInfo;
export type MenuItem = { id: number; name: string; price: number | null; description: string; has_image: boolean };
/** どこから開いたか（クーポン・広告から開いたときは、その内容をいちばん上に大きく出す） */
export type SheetFrom = { type: "coupon"; couponId: number } | { type: "ad"; ad: Ad } | { type: "shop" };

/** スクロールする枠の中での要素の位置 */
const posIn = (box: HTMLElement, el: HTMLElement) => el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;

/** 電話番号らしい文字列なら、タップで電話をかけられるようにする */
export const phoneOf = (s?: string | null) => {
  const m = s?.match(/0\d{1,4}-?\d{1,4}-?\d{3,4}/);
  return m ? m[0].replace(/-/g, "") : null;
};

/**
 * お店のページ（画面いっぱいに開く。パソコンは左側）。
 * 1 回目のタップで「行くかどうか決めるための情報」をすべて出し、
 * 2 回目のタップ（経路・電話・クーポンを使う）で来店につなげる。
 */
export default function DetailSheet({
  shop,
  coupons,
  menu,
  photos = [],
  shopAds,
  from,
  me,
  meters,
  favorite,
  nearby,
  favIds,
  onClose,
  onRoute,
  onNav,
  onCall,
  onFavorite,
  onShare,
  onUseCoupon,
  onOpenShop,
  onToggleFavorite,
}: {
  shop: DetailShop;
  coupons: DetailCoupon[] | null;
  menu: MenuItem[] | null;
  photos?: SlidePhoto[];
  shopAds: Ad[];
  from: SheetFrom;
  me: { lat: number; lng: number } | null;
  meters: number | null;
  favorite: boolean;
  nearby: { shop: CardShop; meters: number }[];
  favIds: Set<number>;
  onClose: () => void;
  onRoute: () => void;
  onNav: () => void;
  onCall: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onUseCoupon: (c: DetailCoupon) => void;
  onOpenShop: (id: number) => void;
  onToggleFavorite?: (id: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  // 別のお店に切り替えたら、いちばん上から見せる
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [shop.id, from]);

  const tabs = (
    [
      ["top", "写真・概要", true],
      ["coupon", "クーポン", (coupons?.length ?? 0) > 0],
      ["menu", "メニュー", (menu?.length ?? 0) > 0],
      ["hours", "営業時間", Boolean(shop.weekly_hours || shop.business_hours || shop.closed_days || shop.special_days?.length)],
      ["info", "支払い・アクセス", true],
      ["near", "近くのお店", nearby.length > 0],
    ] as [string, string, boolean][]
  ).filter((t) => t[2]);
  const [activeTab, setActiveTab] = useState("top");
  const jump = (key: string) => {
    const box = scroller.current;
    if (!box) return;
    if (key === "top") return box.scrollTo({ top: 0, behavior: "smooth" });
    const el = box.querySelector<HTMLElement>(`[data-sec="${key}"]`);
    if (el) box.scrollTo({ top: posIn(box, el) - 52, behavior: "smooth" });
  };
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const onScroll = () => {
      let cur = "top";
      box.querySelectorAll<HTMLElement>("[data-sec]").forEach((el) => {
        if (posIn(box, el) - 60 <= box.scrollTop) cur = el.dataset.sec!;
      });
      setActiveTab(cur);
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, []);

  const tel = phoneOf(shop.contact);
  const status = shopStatus(shop);
  const gmapSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name} ${shop.address ?? ""}`)}`;
  const gmapNav = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}&travelmode=${meters != null && meters > 2500 ? "driving" : "walking"}`;
  const focusCoupon = from.type === "coupon" ? coupons?.find((c) => c.id === from.couponId) : undefined;
  const focusAd = from.type === "ad" ? from.ad : undefined;
  const otherCoupons = (coupons ?? []).filter((c) => c.id !== focusCoupon?.id);
  const otherAds = shopAds.filter((a) => a.id !== focusAd?.id);
  const bestCoupon = focusCoupon ?? coupons?.[0];
  const features = Array.from(new Set([...(shop.amenities ?? []), ...paymentTags(shop)]));
  const payments = paymentRows(shop.payment_methods, shop.payment_none);
  const sns = (
    [
      ["Instagram", shop.instagram_url],
      ["Threads", shop.threads_url],
      ["Facebook", shop.facebook_url],
      ["X（Twitter）", shop.twitter_url],
    ] as [string, string | null | undefined][]
  ).filter((x): x is [string, string] => Boolean(x[1]));

  return (
    <div
      className="fixed inset-0 z-[1500] flex flex-col bg-cream lg:inset-auto lg:bottom-0 lg:left-0 lg:top-14 lg:w-[480px] lg:border-r lg:border-slate-200 lg:shadow-[8px_0_24px_rgba(20,40,77,0.12)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${shop.name}の詳細`}
    >
      {/* 上の帯（戻る・保存・共有） */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-slate-200/80 bg-[#FFFDF9]/95 px-2 backdrop-blur">
        <button onClick={onClose} className="flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-saga-600 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" aria-hidden />
          地図に戻る
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-bold text-slate-700">{shop.name}</span>
        <button onClick={onFavorite} aria-label={favorite ? "お気に入りから外す" : "お気に入りに保存"} aria-pressed={favorite} className="rounded-full p-2.5 hover:bg-slate-100">
          <Heart className={`h-5 w-5 ${favorite ? "fill-coupon text-coupon" : "text-slate-600"}`} aria-hidden />
        </button>
        <button onClick={onShare} aria-label="共有" className="rounded-full p-2.5 text-slate-600 hover:bg-slate-100">
          <Share2 className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain pb-28">
        {/* ① 押したクーポン／広告の内容をいちばん上に */}
        {focusCoupon && <CouponHero coupon={focusCoupon} shopName={shop.name} onUse={() => onUseCoupon(focusCoupon)} />}
        {from.type === "coupon" && !focusCoupon && coupons === null && <div className="m-4 h-40 animate-pulse rounded-3xl bg-white" />}
        {focusAd && <AdHero ad={focusAd} />}

        {/* ② お店の写真と名前 */}
        <section className="bg-white">
          <PhotoSlider
            main={shop.has_photo ? `/api/businesses/${shop.id}/photo?v=${shop.photo_version ?? 0}` : null}
            photos={photos}
            name={shop.name}
            fallback={shop.has_photo ? <ShopPhoto shop={shop} className="h-52 w-full" /> : null}
          />
          <div className="px-4 pb-4 pt-3">
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-slate-500">
              <CategoryIcon category={shop.category} className="h-3.5 w-3.5" />
              {shop.category}
              {shop.price_level ? <span>・{PRICE_LEVEL_LABELS[shop.price_level]}</span> : null}
            </p>
            <h1 className="mt-1 text-[24px] font-bold leading-snug text-slate-900">{shop.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {status && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.open ? "bg-tea-100 text-tea-700" : "bg-slate-100 text-slate-600"}`}>{status.label}</span>
              )}
              {meters != null && (
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Footprints className="h-4 w-4 text-saga-600" aria-hidden />
                  現在地から {travelText(meters)}
                </span>
              )}
            </div>
            {shop.service_description && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{shop.service_description}</p>}
            {features.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="お店の特徴">
                {features.map((a) => (
                  <li key={a} className="inline-flex items-center gap-1 rounded-full bg-saga-50 px-2.5 py-1 text-xs font-bold text-saga-700">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
            )}

            {/* ③ 行動ボタン（2 回目のタップで来店へ） */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              <Action icon={Navigation} label="経路" onClick={onRoute} primary />
              {tel ? <Action icon={Phone} label="電話" href={`tel:${tel}`} onClick={onCall} /> : <Action icon={MapIcon} label="地図アプリ" href={gmapSearch} />}
              {shop.reservation_url ? (
                <Action icon={CalendarCheck} label="予約する" href={shop.reservation_url} onClick={onCall} />
              ) : (
                <Action icon={Heart} label={favorite ? "保存済み" : "保存"} onClick={onFavorite} on={favorite} />
              )}
              {shop.line_url ? (
                <Action icon={MessageCircle} label="LINE" href={shop.line_url} onClick={onCall} />
              ) : shop.website_url ? (
                <Action icon={Globe} label="ホームページ" href={shop.website_url} />
              ) : (
                <Action icon={Share2} label="共有" onClick={onShare} />
              )}
            </div>
          </div>
        </section>

        {/* お店のページの目次（食べログ・ホットペッパーのように、見たい情報へ 1 タップで） */}
        <nav
          aria-label="お店のページの目次"
          className="no-scrollbar sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-slate-200/80 bg-[#FFFDF9]/95 px-3 py-2 backdrop-blur"
        >
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => jump(key)}
              aria-current={activeTab === key ? "true" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
                activeTab === key ? "bg-saga-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ④ このお店のクーポン */}
        <div data-sec="coupon" />
        {(otherCoupons.length > 0 || (!focusCoupon && coupons === null)) && (
          <section className="px-4 pt-5">
            <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-coupon">
              <Ticket className="h-4 w-4" aria-hidden />
              {focusCoupon ? "このお店のほかのクーポン" : "このお店で使えるクーポン"}
            </h2>
            {coupons === null && <div className="mt-2 h-20 animate-pulse rounded-2xl bg-white" />}
            <div className="mt-2 space-y-2">
              {otherCoupons.map((c) => (
                <CouponLine key={c.id} coupon={c} onUse={() => onUseCoupon(c)} />
              ))}
            </div>
          </section>
        )}
        {coupons !== null && coupons.length === 0 && (
          <p className="mx-4 mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200/70">このお店は、いまクーポンを配信していません。</p>
        )}

        <div data-sec="menu" />
        {/* メニュー・商品（写真・価格） */}
        {menu && menu.length > 0 && (
          <Carousel title="メニュー・商品" eyebrow="MENU" icon={<UtensilsCrossed className="h-4 w-4 text-asa-500" aria-hidden />} count={menu.length}>
            {menu.map((m) => (
              <div key={m.id} className="w-[176px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
                {m.has_image ? (
                  <img src={`/api/menu/${m.id}/image`} alt="" className="h-28 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-16 items-center justify-center bg-gradient-to-br from-[#F3EDE3] to-[#E9DCC6] text-[#B49F7E]">
                    <UtensilsCrossed className="h-6 w-6" aria-hidden />
                  </div>
                )}
                <div className="p-2.5">
                  <p className="line-clamp-2 text-sm font-bold leading-snug">{m.name}</p>
                  {m.price != null && <p className="num mt-0.5 text-base font-extrabold text-slate-900">¥{m.price.toLocaleString()}</p>}
                  {m.description && <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-slate-500">{m.description}</p>}
                </div>
              </div>
            ))}
          </Carousel>
        )}

        {/* ⑤ お店からのお知らせ（広告） */}
        {otherAds.length > 0 && (
          <section className="px-4 pt-5">
            <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
              <Megaphone className="h-4 w-4 text-slate-500" aria-hidden />
              お店からのお知らせ
            </h2>
            <div className="mt-2 space-y-3">
              {otherAds.map((ad) => (
                <AdHero key={ad.id} ad={ad} compact />
              ))}
            </div>
          </section>
        )}

        <div data-sec="hours" />
        {/* ⑥ 営業時間・カレンダー */}
        <HoursCard
          weeklyHours={shop.weekly_hours}
          specials={shop.special_days}
          note={shop.hours_note}
          hoursText={shop.business_hours}
          closedText={shop.closed_days}
        />

        <div data-sec="info" />
        {/* ⑦ 基本情報 */}
        <section className="mx-4 mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200/70">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
            <Store className="h-4 w-4 text-saga-600" aria-hidden />
            お店の情報
          </h2>
          <dl className="mt-3 space-y-3 text-[15px]">
            <Info icon={Clock} label="営業時間">
              {status ? (
                <span className={status.open ? "font-bold text-tea-700" : "text-slate-600"}>{status.label}</span>
              ) : shop.business_hours || shop.closed_days ? (
                <>
                  {shop.business_hours && <span className="block">{shop.business_hours}</span>}
                  {shop.closed_days && <span className="block text-slate-500">定休日：{shop.closed_days}</span>}
                </>
              ) : (
                <span className="text-slate-400">お店にお問い合わせください</span>
              )}
            </Info>
            {shop.address && (
              <Info icon={MapPin} label="住所">
                <a href={gmapSearch} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-2">
                  {shop.address}
                </a>
              </Info>
            )}
            {shop.contact && (
              <Info icon={Phone} label="電話・連絡先">
                {tel ? (
                  <a href={`tel:${tel}`} onClick={onCall} className="font-bold text-saga-600">
                    {shop.contact}
                  </a>
                ) : (
                  shop.contact
                )}
              </Info>
            )}
            {(shop.reservation_url || shop.line_url || shop.website_url) && (
              <Info icon={Globe} label="予約・LINE・ホームページ">
                <span className="flex flex-wrap gap-4">
                  {shop.reservation_url && (
                    <a href={shop.reservation_url} target="_blank" rel="noreferrer" onClick={onCall} className="font-bold text-saga-600">
                      予約ページ
                    </a>
                  )}
                  {shop.line_url && (
                    <a href={shop.line_url} target="_blank" rel="noreferrer" onClick={onCall} className="font-bold text-saga-600">
                      LINE で問い合わせ
                    </a>
                  )}
                  {shop.website_url && (
                    <a href={shop.website_url} target="_blank" rel="noreferrer" className="font-bold text-saga-600">
                      ホームページ
                    </a>
                  )}
                </span>
              </Info>
            )}
            {payments.length > 0 && (
              <Info icon={Wallet} label="お支払い方法（現金以外）">
                <span className="block space-y-2">
                  <span className="block text-[15px] font-bold text-slate-800">お支払い方法（現金以外）</span>
                  {payments.map((r) => (
                    <span key={r.key} className="block">
                      <span className="block text-xs font-bold text-slate-500">{r.label}</span>
                      {r.none ? (
                        <span className="text-slate-400">使えません</span>
                      ) : (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {r.items.map((m) => (
                            <span key={m} className="rounded-md bg-slate-100 px-2 py-0.5 text-[13px] font-bold text-slate-700">
                              {m}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              </Info>
            )}
            {sns.length > 0 && (
              <Info icon={ExternalLink} label="SNS">
                <span className="flex flex-wrap gap-2">
                  {sns.map(([label, href]) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded-full bg-saga-50 px-3 py-1 text-sm font-bold text-saga-700 ring-1 ring-saga-100">
                      {label}
                    </a>
                  ))}
                </span>
              </Info>
            )}
          </dl>
          {/* 小さな地図（場所の確認） */}
          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <MapView shops={[shop]} me={me} selectedId={shop.id} highlightRadius={Number.POSITIVE_INFINITY} legend={false} layerToggle={false} className="h-44" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={onRoute} className="btn-outline">
              <Navigation className="h-4 w-4" aria-hidden />
              経路を見る
            </button>
            <a href={gmapNav} target="_blank" rel="noreferrer" onClick={onNav} className="btn-outline">
              <MapIcon className="h-4 w-4" aria-hidden />
              ナビを開く
            </a>
          </div>
        </section>

        <div data-sec="near" />
        {/* ⑦ 3 回目のタップ：近くのお店（はしご・ついで寄りを提案） */}
        {nearby.length > 0 && (
          <Carousel title="このお店の近くのお店" eyebrow="NEXT STOP" icon={<MapPin className="h-4 w-4 text-saga-600" aria-hidden />} note="このお店からの距離・クーポン配信中のお店を先に表示">
            {nearby.map(({ shop: s, meters: m }) => (
              <ShopCard
                key={s.id}
                shop={s}
                meters={m}
                favorite={favIds.has(s.id)}
                onOpen={() => onOpenShop(s.id)}
                onFavorite={onToggleFavorite ? () => onToggleFavorite(s.id) : undefined}
              />
            ))}
          </Carousel>
        )}
      </div>

      {/* 下に固定の行動ボタン（どこまで読んでも 1 タップで向かえる） */}
      <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-slate-200/80 bg-[#FFFDF9]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {bestCoupon && (
          <button onClick={() => onUseCoupon(bestCoupon)} className="btn flex-1 rounded-full bg-coupon py-3 text-white hover:bg-coral-600">
            <Ticket className="h-4 w-4" aria-hidden />
            {bestCoupon.coupon_type === "gift" ? "特典を使う" : `${couponShort(bestCoupon)}を使う`}
          </button>
        )}
        <button onClick={onRoute} className="btn-accent flex-1 rounded-full py-3">
          <Navigation className="h-4 w-4" aria-hidden />
          ここへ行く
        </button>
      </div>
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  href,
  primary,
  on,
}: {
  icon: typeof Navigation;
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  on?: boolean;
}) {
  const cls = `flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-bold ${primary ? "bg-asa-500 text-white" : "bg-slate-50 text-saga-600 ring-1 ring-slate-200/70"}`;
  const inner = (
    <>
      <Icon className={`h-5 w-5 ${on ? "fill-coupon text-coupon" : ""}`} aria-hidden />
      {label}
    </>
  );
  if (href) {
    return (
      <a href={href} onClick={onClick} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls} aria-pressed={on}>
      {inner}
    </button>
  );
}

function Info({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="shrink-0 pt-0.5 text-slate-400">
        <Icon className="h-4 w-4" aria-label={label} />
      </dt>
      <dd className="min-w-0 text-slate-700">{children}</dd>
    </div>
  );
}

/** 押したクーポンを大きく（条件・期限・使い方まで） */
function CouponHero({ coupon: c, shopName, onUse }: { coupon: DetailCoupon; shopName: string; onUse: () => void }) {
  const left = daysLeft(c.expires_at);
  const badge = couponBadge(c);
  const color = badge.tone === "green" ? "text-tea-600" : badge.tone === "gold" ? "text-sun-500" : "text-coupon";
  return (
    <section className="karakusa bg-saga-600 px-4 pb-5 pt-4">
      <div className="overflow-hidden rounded-3xl bg-[#FAF6EF] shadow-[0_12px_28px_rgba(10,20,40,0.3)]">
        {c.has_image && <img src={`/api/coupons/${c.id}/image`} alt="" className="h-44 w-full object-cover" />}
        <div className="px-5 pb-5 pt-4 text-center">
          <p className="num text-[11px] font-bold tracking-[0.3em] text-asa-500">COUPON</p>
          {(c as { event_title?: string | null }).event_title && (
            <p className="mx-auto mt-1 w-fit rounded-full bg-asa-500 px-3 py-0.5 text-xs font-bold text-white">
              {(c as { event_title?: string | null }).event_title} 限定
            </p>
          )}
          <p className="mt-0.5 text-sm font-bold text-slate-600">{shopName}</p>
          {c.coupon_type === "gift" ? (
            <p className={`mt-2 text-[26px] font-extrabold leading-snug ${color}`}>{c.benefit || "特典サービス"}</p>
          ) : (
            <p className={`mt-2 font-num font-extrabold leading-none ${color}`}>
              {c.coupon_type === "price" && <span className="mr-1 align-middle text-base font-bold">特別価格</span>}
              <span className="text-6xl tracking-tight">{badge.main}</span>
              <span className="text-2xl">{badge.sub}</span>
            </p>
          )}
          {c.coupon_type === "price" && c.regular_price && (
            <p className="mt-1 text-sm text-slate-500">
              通常 <s>{c.regular_price.toLocaleString()}円</s>
            </p>
          )}
          <p className="mt-2 text-lg font-bold text-slate-900">{c.title}</p>
          {c.conditions && <p className="mt-1 text-sm text-slate-600">条件：{c.conditions}</p>}
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600">
            <CalendarClock className="h-4 w-4" aria-hidden />
            {new Date(c.expires_at).toLocaleDateString("ja-JP")}まで
            {left && <b className="ml-1 rounded-full bg-coral-50 px-2 py-0.5 text-xs text-coupon">{left}</b>}
          </p>
          <p className="mt-1 flex flex-wrap justify-center gap-1">
            {couponRules(c).map((t) => (
              <span key={t} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-saga-600 ring-1 ring-saga-100">
                {t}
              </span>
            ))}
          </p>
          <div className="my-4 border-t-2 border-dashed border-slate-300" aria-hidden />
          <ol className="grid grid-cols-3 gap-2 text-left text-[11px] leading-snug text-slate-600">
            <li>
              <b className="num block text-base text-saga-600">1</b>お店へ行く
            </li>
            <li>
              <b className="num block text-base text-saga-600">2</b>お会計の前に「使う」
            </li>
            <li>
              <b className="num block text-base text-saga-600">3</b>店員さんに画面を見せる
            </li>
          </ol>
          <button onClick={onUse} className="btn mt-4 w-full rounded-full bg-coupon py-3 text-base text-white hover:bg-coral-600">
            <Ticket className="h-5 w-5" aria-hidden />
            このクーポンを使う
          </button>
        </div>
      </div>
    </section>
  );
}

/** クーポンの 1 行（残り日数・使い方の条件つき） */
function CouponLine({ coupon: c, onUse }: { coupon: DetailCoupon; onUse: () => void }) {
  const left = daysLeft(c.expires_at);
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
      {c.has_image && <img src={`/api/coupons/${c.id}/image`} alt="" className="h-32 w-full object-cover" loading="lazy" />}
      <div className="flex items-stretch">
        <CouponStub coupon={c} />
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-3">
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{c.title}</span>
            {c.coupon_type === "gift" && c.benefit && <span className="block text-xs font-bold text-tea-700">{c.benefit}</span>}
            <span className="block text-xs text-slate-500">
              {c.conditions && `${c.conditions}・`}
              {new Date(c.expires_at).toLocaleDateString("ja-JP")}まで
              {left && <b className="ml-1 text-coupon">{left}</b>}
            </span>
            <span className="block text-[11px] text-slate-400">{couponRules(c).join("・")}</span>
          </span>
          <button onClick={onUse} className="btn-primary shrink-0 rounded-full px-4 py-2">
            使う
          </button>
        </div>
      </div>
    </div>
  );
}

/** 広告（PR）の内容を大きく */
function AdHero({ ad, compact = false }: { ad: Ad; compact?: boolean }) {
  return (
    <section className={compact ? "overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70" : "bg-white"}>
      {ad.has_image && <img src={`/api/ads/${ad.id}/image`} alt="" className={`w-full object-cover ${compact ? "h-40" : "max-h-[46vh] min-h-[200px]"}`} />}
      <div className="p-4">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded border border-slate-300 px-1.5 py-px text-[10px] font-bold tracking-wide text-slate-500">PR</span>
          {ad.business_name} からのお知らせ
        </p>
        <h2 className={`mt-1.5 font-bold leading-snug text-slate-900 ${compact ? "text-base" : "text-xl"}`}>{ad.headline}</h2>
        {ad.body && <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{ad.body}</p>}
        {ad.ends_at && <p className="mt-2 text-xs text-slate-400">{new Date(ad.ends_at).toLocaleDateString("ja-JP")} まで掲載</p>}
      </div>
    </section>
  );
}

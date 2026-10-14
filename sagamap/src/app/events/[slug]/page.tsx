"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CalendarDays, ExternalLink, MapPin, Share2, Ticket } from "lucide-react";
import MapView from "@/components/MapView";
import ShopPhoto from "@/components/ShopPhoto";
import { CouponStub } from "@/components/CouponRow";
import { eventPeriod, eventStatus, type SagaEvent } from "@/lib/events";
import { couponRules, couponShort, type CouponValue } from "@/lib/coupon";
import { daysLeft } from "@/lib/open-status";

type EventCoupon = CouponValue & {
  id: number;
  title: string;
  conditions: string;
  expires_at: string;
  max_uses?: number | null;
  used_count?: number | null;
  repeatable?: boolean | null;
  first_visit_only?: boolean | null;
  business_id: number;
  business_name: string;
  category: string;
  lat: number;
  lng: number;
  has_photo: boolean;
  photo_version: number | null;
};

/** イベント特集のページ（だれでも見られる。クーポンを使うときに会員登録） */
export default function EventPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<{ event: SagaEvent; coupons: EventCoupon[] } | null | "missing">(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${encodeURIComponent(params.slug)}`)
      .then((r) => (r.ok ? r.json() : "missing"))
      .then(setData)
      .catch(() => setData("missing"));
  }, [params.slug]);

  if (data === "missing")
    return (
      <main className="mx-auto max-w-lg p-6 text-center">
        <p className="font-bold">このイベントは見つかりませんでした。</p>
        <Link href="/" className="btn-primary mt-4">
          地図でお店をさがす
        </Link>
      </main>
    );
  if (!data) return <main className="mx-auto max-w-3xl p-4"><div className="h-60 animate-pulse rounded-3xl bg-white" /></main>;

  const { event: ev, coupons } = data;
  const st = eventStatus(ev);
  const shops = Array.from(new Map(coupons.map((c) => [c.business_id, c])).values()).map((c) => ({
    id: c.business_id,
    name: c.business_name,
    category: c.category,
    lat: c.lat,
    lng: c.lng,
    has_coupon: true,
    best_label: couponShort(c),
  }));
  const shopLink = (c: EventCoupon) => `/?shop=${c.business_id}&coupon=${c.id}`;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: ev.title, text: `${ev.title}の限定クーポン`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* 共有をやめたときは何もしない */
    }
  }

  return (
    <main className="mx-auto max-w-3xl pb-16">
      {/* 特集の表紙 */}
      <section className="relative overflow-hidden text-white sm:mx-4 sm:mt-4 sm:rounded-3xl" style={{ background: ev.color }}>
        <img src="/art/panorama.svg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-soft-light" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" aria-hidden />
        <div className="relative px-5 pb-6 pt-10">
          <p className="num text-[11px] font-bold tracking-[0.3em] text-white/85">EVENT 特集</p>
          <h1 className="mt-1 font-mincho text-[28px] font-bold leading-tight drop-shadow">{ev.title}</h1>
          {ev.subtitle && <p className="mt-1 text-sm text-white/90">{ev.subtitle}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className={`rounded-full px-3 py-1 ${st.live ? "bg-white text-slate-900" : "bg-black/30"}`}>{st.label}</span>
            <span className="flex items-center gap-1 rounded-full bg-black/30 px-3 py-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              <span className="num">{eventPeriod(ev)}</span>
            </span>
            {ev.area && (
              <span className="flex items-center gap-1 rounded-full bg-black/30 px-3 py-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {ev.area}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-5 px-4 pt-4">
        {ev.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{ev.description}</p>}
        <div className="flex flex-wrap gap-2">
          {ev.link_url && (
            <a href={ev.link_url} target="_blank" rel="noreferrer" className="btn-outline">
              <ExternalLink className="h-4 w-4" aria-hidden />
              公式サイト
            </a>
          )}
          <button type="button" onClick={share} className="btn-outline">
            <Share2 className="h-4 w-4" aria-hidden />
            {copied ? "リンクをコピーしました" : "友だちに教える"}
          </button>
        </div>

        {/* 限定クーポン */}
        <section>
          <h2 className="flex items-center gap-1.5 text-lg font-bold text-coupon">
            <Ticket className="h-5 w-5" aria-hidden />
            この期間だけの限定クーポン <span className="num text-base text-slate-500">{coupons.length}件</span>
          </h2>
          {coupons.length === 0 ? (
            <p className="mt-2 rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200/70">
              参加するお店を準備中です。お店の方は、ダッシュボードの「クーポン発行」で「イベント限定」を選ぶと、ここに載ります。
            </p>
          ) : (
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {coupons.map((c) => {
                const left = daysLeft(c.expires_at);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => router.push(shopLink(c))}
                      className="flex w-full overflow-hidden rounded-2xl bg-white text-left shadow-pop ring-1 ring-slate-200/70"
                    >
                      <CouponStub coupon={c} />
                      <span className="min-w-0 flex-1 p-3">
                        <span className="block truncate text-xs text-slate-500">{c.business_name}</span>
                        <span className="mt-0.5 line-clamp-2 block font-bold leading-snug">{c.title}</span>
                        <span className="mt-1 block truncate text-[11px] text-slate-500">
                          {[c.conditions, ...couponRules(c)].filter(Boolean).join("・")}
                        </span>
                        {left && <span className="mt-1 inline-block rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-bold text-coral-700">{left}</span>}
                      </span>
                      <span className="hidden w-24 shrink-0 sm:block">
                        <ShopPhoto shop={{ id: c.business_id, name: c.business_name, category: c.category, has_photo: c.has_photo, photo_version: c.photo_version }} className="h-full w-full" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {shops.length > 0 && (
          <section>
            <h2 className="flex items-center gap-1.5 text-lg font-bold">
              <MapPin className="h-5 w-5 text-saga-600" aria-hidden />
              参加しているお店
            </h2>
            <div className="mt-2 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <MapView shops={shops} me={null} highlightRadius={Number.POSITIVE_INFINITY} onSelectShop={(id) => router.push(`/?shop=${id}`)} legend={false} className="h-72" />
            </div>
          </section>
        )}

        {!session?.user && (
          <div className="rounded-3xl bg-saga-600 p-5 text-center text-white">
            <p className="font-bold">クーポンを使うには、無料の会員登録（30 秒）</p>
            <Link href={`/register/customer?next=${encodeURIComponent(`/events/${ev.slug}`)}`} className="btn-accent mt-3 w-full rounded-full py-3">
              無料で登録してクーポンを使う
            </Link>
          </div>
        )}
        <Link href="/" className="btn-outline w-full">
          地図でほかのお店もさがす
        </Link>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, ChevronRight, Clock, Heart, Mail, Map as MapIcon, Route as RouteIcon, Settings } from "lucide-react";
import { api } from "@/lib/fetcher";
import Carousel from "@/components/customer/Carousel";
import SectionTitle from "@/components/ui/SectionTitle";
import { ShopCard } from "@/components/customer/Cards";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import EmailChangeForm from "@/components/EmailChangeForm";
import DeleteAccount from "@/components/DeleteAccount";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import NotifySetting from "@/components/NotifySetting";
import NotificationList from "@/components/customer/NotificationList";
import { useNotifications } from "@/hooks/useNotifications";

type Favorite = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
  best_discount: number | null;
  best_label?: string | null;
  has_photo?: boolean;
  photo_version?: number | null;
};
type Row = {
  id: number;
  viewed_at: string;
  coupon_used: boolean;
  business_id: number;
  business_name: string;
  category: string;
  coupon_title: string | null;
  discount_rate: number | null;
  coupon_label?: string | null;
};

export default function MyPage() {
  return (
    <Suspense>
      <MyPageInner />
    </Suspense>
  );
}

/** マイページ：お知らせ・お気に入り・利用履歴・設定（地図はトップの 1 画面にまとめた） */
function MyPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const notes = useNotifications(true);
  const newsRef = useRef<HTMLElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<"all" | "coupon">("all");

  // 以前のリンク（メールのお知らせなど）の「?shop=」は、地図の画面でそのお店を開く
  const shop = params.get("shop");
  useEffect(() => {
    if (shop) router.replace(`/?shop=${encodeURIComponent(shop)}`);
  }, [shop, router]);

  const loadFavorites = () => api<{ favorites: Favorite[] }>("/api/favorites").then((d) => setFavorites(d.favorites));
  useEffect(() => {
    if (shop) return;
    loadFavorites();
    api<{ history: Row[] }>("/api/history").then((d) => setRows(d.history));
  }, [shop]);

  // いま見ている欄（下のメニューで色を付ける）
  const [activeSection, setActiveSection] = useState("news");
  useEffect(() => {
    const ids = ["news", "favorites", "history", "settings"];
    const onScroll = () => {
      let cur = "news";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) cur = id;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = "settings";
      setActiveSection(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // お知らせ欄が画面に入ったら（＝見たら）既読にする。未読の数・地図の画面の「新しいお知らせ」も消える
  const { markSeen, items: noteItems } = notes;
  useEffect(() => {
    const el = newsRef.current;
    if (!el || noteItems.every((n) => n.read_at)) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) setTimeout(markSeen, 800);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [noteItems, markSeen]);

  if (shop) return null;
  const unread = notes.unread;
  const section = activeSection;
  const shown = (rows ?? []).filter((r) => filter === "all" || r.coupon_used);
  const usedCount = (rows ?? []).filter((r) => r.coupon_used).length;

  async function removeFavorite(id: number) {
    await api(`/api/favorites?businessId=${id}`, { method: "DELETE" });
    loadFavorites();
  }

  const nav = [
    { href: "#news", label: "お知らせ", icon: Bell, badge: unread },
    { href: "#favorites", label: "お気に入り", icon: Heart, badge: 0 },
    { href: "#history", label: "利用履歴", icon: Clock, badge: 0 },
    { href: "#settings", label: "設定", icon: Settings, badge: 0 },
  ];

  return (
    <main className="mx-auto max-w-3xl pb-10">
      <section className="karakusa bg-saga-600 px-5 pb-6 pt-6 text-white sm:mx-4 sm:mt-4 sm:rounded-3xl">
        <p className="num text-[10px] font-bold tracking-[0.3em] text-white/70">MY PAGE</p>
        <h1 className="mt-1 text-2xl font-extrabold">{session?.user.name ? `${session.user.name}さんのページ` : "マイページ"}</h1>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="お気に入り" value={favorites.length} />
          <Stat label="使ったクーポン" value={usedCount} />
          <Stat label="新着のお知らせ" value={unread + notes.freshIds.size} />
        </div>
        <Link href="/" className="btn-accent mt-4 w-full rounded-full py-3">
          <MapIcon className="h-4 w-4" aria-hidden />
          地図でお店をさがす
        </Link>
      </section>

      <nav className="sticky top-14 z-10 flex border-b border-slate-200 bg-[#FFFDF9]/95 backdrop-blur sm:mx-4 sm:mt-3 sm:rounded-2xl sm:border sm:shadow-pop">
        {nav.map((n) => (
          <a
            key={n.href}
            href={n.href}
            aria-current={section === n.href.slice(1) ? "true" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${section === n.href.slice(1) ? "text-saga-700" : "text-slate-500"}`}
          >
            <span className={`grid h-7 w-12 place-items-center rounded-full transition ${section === n.href.slice(1) ? "bg-saga-600 text-white" : "text-saga-600"}`}>
              <n.icon className="h-5 w-5" aria-hidden />
            </span>
            {n.label}
            {n.badge > 0 && <span className="num absolute right-[22%] top-1.5 rounded-full bg-coupon px-1.5 text-[10px] text-white">{n.badge}</span>}
          </a>
        ))}
      </nav>

      <div className="space-y-2 px-4 pt-3 empty:hidden">
        <VerifyEmailBanner />
      </div>

      {/* お知らせ */}
      <section id="news" ref={newsRef} className="scroll-mt-28 px-4 pt-5">
        <SectionTitle eyebrow="NEWS" title="お知らせ" icon={<Bell className="h-4 w-4 text-asa-500" aria-hidden />} />
        <div className="mt-2">
          <NotificationList
            items={notes.items}
            freshIds={notes.freshIds}
            onOpen={(n) => n.link && router.push(n.link)}
            onDelete={notes.remove}
            onDeleteRead={notes.removeRead}
          />
        </div>
      </section>

      {/* お気に入り */}
      <section id="favorites" className="scroll-mt-28 pt-3">
        {favorites.length === 0 ? (
          <div className="px-4 pt-2">
            <SectionTitle eyebrow="FAVORITE" title="お気に入り" icon={<Heart className="h-4 w-4 text-coupon" aria-hidden />} />
            <p className="mt-2 rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200/70">
              まだありません。地図のお店のカードや、お店の画面の「保存」を押すと、ここに集まります。
            </p>
          </div>
        ) : (
          <>
            <Carousel title="お気に入り" eyebrow="FAVORITE" icon={<Heart className="h-4 w-4 text-coupon" aria-hidden />} count={favorites.length}>
              {favorites.map((f) => (
                <ShopCard key={f.id} shop={f} meters={null} favorite onOpen={() => router.push(`/?shop=${f.id}`)} onFavorite={() => removeFavorite(f.id)} />
              ))}
            </Carousel>
            {favorites.length >= 2 && (
              <div className="px-4">
                <Link href="/?route=fav" className="btn-primary w-full rounded-full py-3">
                  <RouteIcon className="h-4 w-4" aria-hidden />
                  お気に入りを巡るルートを地図で見る
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* 利用履歴 */}
      <section id="history" className="scroll-mt-28 px-4 pt-6">
        <SectionTitle
          eyebrow="HISTORY"
          title="利用履歴"
          icon={<Clock className="h-4 w-4 text-saga-600" aria-hidden />}
          note="見たお店と使ったクーポンです。おすすめを選ぶときの参考にしています。"
        />
        <div className="mt-2 flex gap-2">
          <button onClick={() => setFilter("all")} className={filter === "all" ? "chip-on" : "chip-off"}>
            すべて
          </button>
          <button onClick={() => setFilter("coupon")} className={filter === "coupon" ? "chip-on" : "chip-off"}>
            使ったクーポン
          </button>
        </div>
        {rows === null ? (
          <p className="mt-3 text-sm text-slate-500">読み込み中…</p>
        ) : shown.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">履歴はまだありません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
            {shown.slice(0, 50).map((r) => (
              <li key={r.id}>
                <Link href={`/?shop=${r.business_id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${r.coupon_used ? "bg-coral-50 text-coupon" : "bg-slate-100 text-slate-500"}`}>
                    {r.coupon_used ? "利用" : "閲覧"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{r.business_name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {r.category}
                      {r.coupon_title && `・${r.coupon_title}（${r.coupon_label ?? `${r.discount_rate}%OFF`}）`}
                    </span>
                  </span>
                  <time className="shrink-0 text-xs text-slate-500">
                    {new Date(r.viewed_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 設定 */}
      <section id="settings" className="scroll-mt-28 space-y-4 px-4 pt-6">
        <SectionTitle eyebrow="SETTINGS" title="設定" icon={<Settings className="h-4 w-4 text-saga-600" aria-hidden />} />
        <NotifySetting />
        <EmailChangeForm />
        <PasswordChangeForm />
        <Link href="/contact" className="card flex items-center gap-3 hover:bg-slate-50">
          <Mail className="h-5 w-5 shrink-0 text-saga-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">お問い合わせ</span>
            <span className="block text-xs text-slate-500">使い方・クーポン・退会・個人情報のご請求など</span>
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
        </Link>
        <DeleteAccount />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-2.5 ring-1 ring-white/15">
      <p className="num text-2xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-white/80">{label}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, ChevronRight, Clock, Heart, Map as MapIcon, Route as RouteIcon, Settings } from "lucide-react";
import { api } from "@/lib/fetcher";
import Carousel from "@/components/customer/Carousel";
import { ShopCard } from "@/components/customer/Cards";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import EmailChangeForm from "@/components/EmailChangeForm";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import NotifySetting from "@/components/NotifySetting";

type Favorite = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
  best_discount: number | null;
  has_photo?: boolean;
  photo_version?: number | null;
};
type Notification = { id: number; title: string; body: string; link: string | null; created_at: string; read_at: string | null };
type Row = {
  id: number;
  viewed_at: string;
  coupon_used: boolean;
  business_id: number;
  business_name: string;
  category: string;
  coupon_title: string | null;
  discount_rate: number | null;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
    api<{ notifications: Notification[] }>("/api/notifications").then((d) => setNotifications(d.notifications));
    api<{ history: Row[] }>("/api/history").then((d) => setRows(d.history));
  }, [shop]);

  if (shop) return null;
  const unread = notifications.filter((n) => !n.read_at).length;
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
          <Stat label="未読のお知らせ" value={unread} />
        </div>
        <Link href="/" className="btn-accent mt-4 w-full rounded-full py-3">
          <MapIcon className="h-4 w-4" aria-hidden />
          地図でお店をさがす
        </Link>
      </section>

      <nav className="sticky top-14 z-10 flex border-b border-slate-200 bg-[#FFFDF9]/95 backdrop-blur">
        {nav.map((n) => (
          <a key={n.href} href={n.href} className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold text-slate-600">
            <n.icon className="h-5 w-5 text-saga-600" aria-hidden />
            {n.label}
            {n.badge > 0 && <span className="num absolute right-[22%] top-1.5 rounded-full bg-coupon px-1.5 text-[10px] text-white">{n.badge}</span>}
          </a>
        ))}
      </nav>

      <div className="space-y-2 px-4 pt-3 empty:hidden">
        <VerifyEmailBanner />
      </div>

      {/* お知らせ */}
      <section id="news" className="scroll-mt-28 px-4 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
            <Bell className="h-4 w-4 text-asa-500" aria-hidden />
            お知らせ
          </h2>
          {unread > 0 && (
            <button
              className="text-xs font-bold text-saga-600"
              onClick={() =>
                api("/api/notifications", { method: "PATCH" }).then(() =>
                  setNotifications((ns) => ns.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))),
                )
              }
            >
              すべて既読にする
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200/70">お知らせはまだありません。新しいクーポンが出るとここに届きます。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {notifications.slice(0, 20).map((n) => (
              <li key={n.id} className={`rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 ${n.read_at ? "" : "border-l-4 border-l-asa-500"}`}>
                <p className="text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString("ja-JP")}</p>
                <p className="font-bold">{n.title}</p>
                <p className="whitespace-pre-line text-sm text-slate-600">{n.body}</p>
                {n.link && (
                  <Link href={n.link} className="mt-1 inline-flex items-center text-sm font-bold text-saga-600">
                    詳しく見る
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* お気に入り */}
      <section id="favorites" className="scroll-mt-28 pt-3">
        {favorites.length === 0 ? (
          <div className="px-4 pt-2">
            <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
              <Heart className="h-4 w-4 text-coupon" aria-hidden />
              お気に入り
            </h2>
            <p className="mt-2 rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200/70">
              まだありません。地図のお店のカードや、お店の画面の「保存」を押すと、ここに集まります。
            </p>
          </div>
        ) : (
          <>
            <Carousel title="お気に入り" icon={<Heart className="h-4 w-4 text-coupon" aria-hidden />} count={favorites.length}>
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
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
          <Clock className="h-4 w-4 text-saga-600" aria-hidden />
          利用履歴
        </h2>
        <p className="text-xs text-slate-500">見たお店と使ったクーポンです。おすすめを選ぶときの参考にしています。</p>
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
                      {r.coupon_title && `・${r.coupon_title}（${r.discount_rate}%OFF）`}
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
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
          <Settings className="h-4 w-4 text-saga-600" aria-hidden />
          設定
        </h2>
        <NotifySetting />
        <EmailChangeForm />
        <PasswordChangeForm />
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

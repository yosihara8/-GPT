import Link from "next/link";
import { Bell, Heart, Lock, Navigation, Ticket } from "lucide-react";
import { AreaMark } from "@/components/customer/Carousel";
import { getT } from "@/lib/i18n-server";

const BENEFITS = [
  { icon: Ticket, title: "お店のクーポンが使える", text: "割引や特典を、お店で画面を見せるだけで" },
  { icon: Navigation, title: "地図で行き方がわかる", text: "現在地から近いお店と道順をすぐに" },
  { icon: Heart, title: "お気に入りに保存", text: "行きたいお店をまとめて、巡るルートも" },
  { icon: Bell, title: "新しいクーポンのお知らせ", text: "近くのお店のお得な情報が届きます" },
];

/** 会員登録のおすすめ（会員になるとできること＋登録ボタン） */
export async function JoinBand({ next, title = "無料の会員登録で、もっとお得に佐賀めぐり" }: { next?: string; title?: string }) {
  const { t } = await getT();
  return (
    <section className="bg-mizu-50 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <AreaMark className="mb-2" />
        <p className="font-mincho text-[26px] font-bold leading-snug tracking-[0.08em] text-slate-900">{t("無料会員のご案内")}</p>
        <h2 className="mt-1.5 text-[15px] font-bold tracking-[0.1em] text-slate-800">{t(title)}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-saga-50 text-saga-600">
                <b.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">{t(b.title)}</span>
                <span className="block text-xs text-slate-500">{t(b.text)}</span>
              </span>
            </li>
          ))}
        </ul>
        <JoinButton next={next} className="mt-5" />
        <p className="mt-2 text-center text-xs text-slate-500">
          {t("登録は 1 分・無料です。すでに会員の方は")}
          <Link href={`/login${next ? `?callbackUrl=${encodeURIComponent(next)}` : ""}`} className="font-bold text-saga-600 underline underline-offset-2">
            {t("ログイン")}
          </Link>
        </p>
      </div>
    </section>
  );
}

export async function JoinButton({ next, className = "", label = "無料で会員登録する" }: { next?: string; className?: string; label?: string }) {
  const { t } = await getT();
  return (
    <Link href={`/register/customer${next ? `?next=${encodeURIComponent(next)}` : ""}`} className={`btn-accent btn-lg ${className}`}>
      {t(label)}
    </Link>
  );
}

/** 画面の下に固定する登録ボタン（スマホでいつでも押せるように） */
export async function StickyJoin({ next, text }: { next?: string; text: string }) {
  const { t } = await getT();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <p className="min-w-0 flex-1 text-xs font-bold leading-snug text-slate-700">{t(text)}</p>
        <Link href={`/register/customer${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="btn-accent shrink-0 rounded-full px-5 py-2.5">
          {t("無料登録")}
        </Link>
      </div>
    </div>
  );
}

/** 会員だけが見られるクーポン（中身はぼかして、登録へ案内する） */
export async function LockedCoupon({ label, next }: { label: string | null; next: string }) {
  const { t } = await getT();
  return (
    <div className="relative overflow-hidden rounded-xl ring-1 ring-coupon/30">
      <div className="flex items-stretch bg-white blur-[3px]" aria-hidden>
        <div className="grid w-24 place-items-center bg-coupon py-12 text-white">
          <span className="num text-2xl font-extrabold">{t(label ?? "特典")}</span>
        </div>
        <div className="flex-1 space-y-2 p-4">
          <div className="h-3 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 px-4 text-center">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Lock className="h-4 w-4 text-coupon" aria-hidden />
          {label ? t("このお店のクーポン「{l}」は会員限定です", { l: t(label) }) : t("このお店のクーポンは会員限定です")}
        </p>
        <Link href={`/register/customer?next=${encodeURIComponent(next)}`} className="btn-accent rounded-full px-5 py-2">
          {t("無料登録してクーポンを見る")}
        </Link>
      </div>
    </div>
  );
}

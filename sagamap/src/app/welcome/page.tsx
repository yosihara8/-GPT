import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import SagaHero from "@/components/SagaHero";
import GuestMap from "@/components/public/GuestMap";
import { AreaMark } from "@/components/customer/Carousel";
import { JoinBand, StickyJoin } from "@/components/public/Join";
import { GUIDES, GUIDE_EN } from "@/lib/guides";
import { getSessionUser } from "@/lib/session";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "佐賀観光マップ｜佐賀のカフェ・ランチ・宿をクーポンつきでさがせる地図",
  description: "佐賀のお店と、旅する人をつなぐ観光マップ。地図からお店をさがして、会員登録（無料）でお得なクーポンや行き方の案内が使えます。",
};

/**
 * 登録前の方のトップ（ロゴ・ホームを押したとき）。
 * 地図は見るだけ（ピンを押すとお店の公開ページ）。クーポン・行き方・お気に入りは会員登録へ案内する。
 */
export default async function WelcomePage() {
  const user = await getSessionUser();
  if (user?.role === "customer") redirect("/");
  const { lang, t } = await getT();
  return (
    <main className="pb-24">
      <SagaHero
        eyebrow={t("佐賀観光マップ")}
        title={
          <>
            {t("佐賀のお店と、")}
            <br />
            {t("旅する人をつなぐ地図")}
          </>
        }
        lead={t("近くのお店・お得なクーポン・行き方の案内が、すべて無料で使えます。")}
      />
      <div className="mx-auto flex max-w-2xl gap-2 px-5 pt-5">
        <Link href="/register/customer" className="btn-accent btn-lg flex-1">
          {t("無料で登録する")}
        </Link>
        <Link href="/login" className="btn-outline flex-1 rounded-full py-3 text-base">
          {t("ログイン")}
        </Link>
      </div>

      {/* 地図（見るだけ） */}
      <section className="mx-auto max-w-2xl px-5 pt-8">
        <AreaMark className="mb-2" />
        <h2 className="font-mincho text-[22px] font-bold tracking-[0.08em] text-slate-900">{t("地図でお店をさがす")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{t("ピンを押すと、お店の情報が見られます。現在地からの行き方・クーポンは、会員登録（無料）で使えます。")}</p>
        <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-200">
          <GuestMap />
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-saga-600" aria-hidden />
          {t("赤いピンは、会員限定クーポンのあるお店です")}
        </p>
      </section>

      {/* ジャンルからさがす */}
      <section className="mx-auto max-w-2xl px-5 pt-8">
        <AreaMark className="mb-2" />
        <h2 className="font-mincho text-[22px] font-bold tracking-[0.08em] text-slate-900">{t("ジャンルからさがす")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guide/${g.slug}`} className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {lang === "en" ? GUIDE_EN[g.slug].title.replace(/ in Saga$/, "") : g.title.replace(/^佐賀の/, "")}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <JoinBand />
      </div>
      {!user && <StickyJoin text="会員限定クーポンを使うには、無料の会員登録が必要です" />}
    </main>
  );
}

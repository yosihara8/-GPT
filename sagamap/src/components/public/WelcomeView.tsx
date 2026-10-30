import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import SagaHero from "@/components/SagaHero";
import GuestMap from "@/components/public/GuestMap";
import { AreaMark } from "@/components/customer/Carousel";
import { JoinBand, StickyJoin } from "@/components/public/Join";
import { GUIDES, GUIDE_EN, THEMES } from "@/lib/guides";
import { getT } from "@/lib/i18n-server";

/**
 * 登録前の方のトップ（ロゴ・ホームを押したとき）。
 * 地図は見るだけ（ピンを押すとお店の公開ページ）。クーポン・行き方・お気に入りは会員登録へ案内する。
 */
export default async function WelcomeView({ member }: { member: boolean }) {
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
      {/* 登録の入口：お客さまと事業者を分けて、どちらの登録か一目で分かるようにする */}
      <div className="mx-auto grid max-w-2xl gap-3 px-5 pt-5 sm:grid-cols-2">
        <section className="rounded-xl p-4 ring-2 ring-[#1E3A6E]" aria-labelledby="join-customer">
          <p className="w-fit rounded-full bg-[#1E3A6E] px-3 py-1 text-xs font-bold text-white">{t("観光・お出かけの方")}</p>
          <h2 id="join-customer" className="mt-2 font-mincho text-lg font-bold text-slate-900">{t("お客さまの会員登録")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{t("クーポン・地図での行き方・お気に入りが、すべて無料で使えます。")}</p>
          <Link href="/register/customer" className="btn-accent btn-lg mt-3">
            {t("無料で会員登録する")}
          </Link>
          <Link href="/login" className="mt-2 block text-center text-sm text-slate-600 underline">
            {t("会員の方はログイン")}
          </Link>
        </section>
        <section className="rounded-xl p-4 ring-2 ring-[#22402E]" aria-labelledby="join-business">
          <p className="w-fit rounded-full bg-[#22402E] px-3 py-1 text-xs font-bold text-white">{t("お店・事業者の方")}</p>
          <h2 id="join-business" className="mt-2 font-mincho text-lg font-bold text-slate-900">{t("お店を地図に載せる（事業主登録）")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{t("無料で 1 店舗を掲載できます。クーポンや広告で、観光のお客さまを呼び込めます。")}</p>
          <Link href="/register/business" className="btn btn-lg mt-3 bg-[#22402E] text-white hover:bg-[#1B3325]">
            {t("無料で事業主登録する")}
          </Link>
          <Link href="/login?role=business" className="mt-2 block text-center text-sm text-slate-600 underline">
            {t("事業主の方はログイン")}
          </Link>
        </section>
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

      {/* 人気のテーマ（佐賀観光でよく検索される言葉） */}
      <section className="mx-auto max-w-2xl px-5 pt-8">
        <AreaMark className="mb-2" />
        <h2 className="font-mincho text-[22px] font-bold tracking-[0.08em] text-slate-900">{t("人気のテーマからさがす")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {THEMES.map((g) => (
            <Link key={g.slug} href={`/guide/${g.slug}`} className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {lang === "en" ? GUIDE_EN[g.slug].title : g.title}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          ))}
        </div>
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
      {!member && <StickyJoin text="会員限定クーポンを使うには、無料の会員登録が必要です" />}
    </main>
  );
}

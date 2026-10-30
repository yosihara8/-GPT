import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AreaMark } from "@/components/customer/Carousel";
import { JoinBand, StickyJoin } from "@/components/public/Join";
import { GUIDES, GUIDE_EN, THEMES } from "@/lib/guides";
import { guideListings, guideShops } from "@/lib/public-shops";
import { getT } from "@/lib/i18n-server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "佐賀観光のお店さがし｜グルメ・ランチ・カフェ・温泉・お土産",
  description: "佐賀観光で人気の佐賀グルメ・ランチ・カフェ・佐賀牛・呼子のいか・嬉野温泉・武雄温泉・有田焼・お土産のお店を、テーマとエリアからさがせます。会員限定のお得なクーポンも。",
};

/** お店さがしの入口（ジャンルの一覧） */
export default async function GuideIndex() {
  const [rows, user, themeShops] = await Promise.all([
    query<{ category: string; n: number }>("SELECT category, count(*)::int AS n FROM businesses GROUP BY category"),
    getSessionUser(),
    Promise.all(THEMES.map(async (g) => (await guideShops(g)).length + (await guideListings(g)).length)),
  ]);
  const count = (c?: string) => rows.find((r) => r.category === c)?.n ?? 0;
  const { lang, t } = await getT();
  return (
    <main className={user ? "pb-10" : "pb-24"}>
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <AreaMark className="mb-2" />
        <h1 className="font-mincho text-[26px] font-bold leading-snug tracking-[0.08em] text-slate-900">{t("佐賀観光のお店さがし")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
          {t("佐賀観光マップに載っているお店を、人気のテーマやジャンルからさがせます。会員登録（無料）をすると、お店のクーポンや地図での行き方も使えます。")}
        </p>
        <h2 className="mt-7 text-[15px] font-bold tracking-[0.1em] text-slate-800">{t("人気のテーマからさがす")}</h2>
        <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
          {THEMES.map((g, i) => (
            <Link key={g.slug} href={`/guide/${g.slug}`} className="flex items-center gap-3 py-4 hover:bg-slate-50">
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900">{lang === "en" ? GUIDE_EN[g.slug].title : g.title}</span>
                <span className="block text-xs text-slate-500">{lang === "en" ? GUIDE_EN[g.slug].lead : g.lead}</span>
              </span>
              <span className="num text-sm text-slate-400">{themeShops[i]}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
            </Link>
          ))}
        </div>
        <h2 className="mt-8 text-[15px] font-bold tracking-[0.1em] text-slate-800">{t("ジャンルからさがす")}</h2>
        <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guide/${g.slug}`} className="flex items-center gap-3 py-4 hover:bg-slate-50">
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900">{lang === "en" ? GUIDE_EN[g.slug].title : g.title}</span>
                <span className="block text-xs text-slate-500">{lang === "en" ? GUIDE_EN[g.slug].lead : g.lead}</span>
              </span>
              <span className="num text-sm text-slate-400">{count(g.category)}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
      {!user && (
        <>
          <div className="mt-10">
            <JoinBand />
          </div>
          <StickyJoin text="会員限定クーポンを使うには、無料の会員登録が必要です" />
        </>
      )}
    </main>
  );
}

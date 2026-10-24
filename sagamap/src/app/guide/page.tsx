import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AreaMark } from "@/components/customer/Carousel";
import { JoinBand, StickyJoin } from "@/components/public/Join";
import { GUIDES, GUIDE_EN } from "@/lib/guides";
import { getT } from "@/lib/i18n-server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "佐賀のお店さがし｜カフェ・ランチ・スイーツ・宿",
  description: "佐賀のカフェ・ランチ・スイーツ・焼き物・温泉宿などを、ジャンルとエリアからさがせます。会員限定のお得なクーポンも。",
};

/** お店さがしの入口（ジャンルの一覧） */
export default async function GuideIndex() {
  const [rows, user] = await Promise.all([query<{ category: string; n: number }>("SELECT category, count(*)::int AS n FROM businesses GROUP BY category"), getSessionUser()]);
  const count = (c: string) => rows.find((r) => r.category === c)?.n ?? 0;
  const { lang, t } = await getT();
  return (
    <main className={user ? "pb-10" : "pb-24"}>
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <AreaMark className="mb-2" />
        <h1 className="font-mincho text-[26px] font-bold leading-snug tracking-[0.08em] text-slate-900">{t("佐賀のお店さがし")}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
          {t("佐賀観光マップに載っているお店を、ジャンルからさがせます。会員登録（無料）をすると、お店のクーポンや地図での行き方も使えます。")}
        </p>
        <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
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

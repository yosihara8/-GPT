import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideView from "@/components/public/GuideView";
import { guideOf, isTheme } from "@/lib/guides";
import { guideListings, guideShops } from "@/lib/public-shops";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const g = guideOf(slug);
  if (!g) return { title: "ページが見つかりません" };
  const theme = isTheme(g);
  // 掲載店がまだ無い「よく検索される言葉」のページは、検索結果に出さない（中身の無いページを載せない）
  const empty = theme && (await guideShops(g)).length === 0 && (await guideListings(g)).length === 0;
  return {
    title: theme ? `${g.title}｜おすすめのお店・クーポン` : `${g.title}おすすめ｜クーポンのあるお店も`,
    description: `${g.lead}を、佐賀観光マップがご紹介。${g.intro.slice(0, 60)}…`,
    ...(empty ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const guide = guideOf(slug);
  if (!guide) notFound();
  const [shops, listings, user] = await Promise.all([guideShops(guide), guideListings(guide), getSessionUser()]);
  return <GuideView guide={guide} shops={shops} listings={listings} member={Boolean(user)} />;
}

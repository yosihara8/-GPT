import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideView from "@/components/public/GuideView";
import { guideOf } from "@/lib/guides";
import { publicShops } from "@/lib/public-shops";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const g = guideOf(slug);
  if (!g) return { title: "ページが見つかりません" };
  return {
    title: `${g.title}おすすめ｜クーポンのあるお店も`,
    description: `${g.lead}を、佐賀観光マップがエリアごとにご紹介。${g.intro.slice(0, 60)}…`,
  };
}

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const guide = guideOf(slug);
  if (!guide) notFound();
  const [shops, user] = await Promise.all([publicShops(guide.category), getSessionUser()]);
  return <GuideView guide={guide} shops={shops} member={Boolean(user)} />;
}

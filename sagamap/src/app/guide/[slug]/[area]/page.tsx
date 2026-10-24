import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideView from "@/components/public/GuideView";
import { AREA_SLUGS, areaKeyOfSlug, guideOf } from "@/lib/guides";
import { AREA_LIST } from "@/lib/areas";
import { publicShops } from "@/lib/public-shops";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string; area: string }> }): Promise<Metadata> {
  const { slug, area } = await props.params;
  const g = guideOf(slug);
  const key = areaKeyOfSlug(area);
  const a = AREA_LIST.find((x) => x.key === key);
  if (!g || !a || !key) return { title: "ページが見つかりません" };
  const place = AREA_SLUGS[key].label;
  return {
    title: `${place}の${g.title.replace(/^佐賀の/, "")}｜佐賀県${a.name}`,
    description: `佐賀県${a.name}（${place}）の${g.lead.replace(/^佐賀の/, "")}を、佐賀観光マップがご紹介します。`,
  };
}

export default async function GuideAreaPage(props: { params: Promise<{ slug: string; area: string }> }) {
  const { slug, area } = await props.params;
  const guide = guideOf(slug);
  const key = areaKeyOfSlug(area);
  if (!guide || !key) notFound();
  const [shops, user] = await Promise.all([publicShops(guide.category), getSessionUser()]);
  return <GuideView guide={guide} areaKey={key} shops={shops} member={Boolean(user)} />;
}

import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";
import { query } from "@/lib/db";
import { AREA_SLUGS, GUIDES, THEMES } from "@/lib/guides";
import { guideListings, guideShops } from "@/lib/public-shops";
import { areaOf } from "@/lib/areas";

// 掲載店が増えたらすぐ反映する（開くたびに作る）
export const dynamic = "force-dynamic";

/**
 * 検索エンジンに渡すページの一覧（誰でも開けるページだけ）。
 * 地図のトップは会員向け（未登録なら会員登録画面へ移る）なので入れない。お店のページ・お店さがしは入れる。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/register/customer`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${APP_URL}/register/business`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${APP_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/tokushoho`, changeFrequency: "yearly", priority: 0.2 },
  ];
  pages.push({ url: `${APP_URL}/guide`, changeFrequency: "daily", priority: 0.9 });
  for (const g of GUIDES) pages.push({ url: `${APP_URL}/guide/${g.slug}`, changeFrequency: "daily", priority: 0.9 });
  try {
    const shops = await query<{ id: number; category: string; address: string }>("SELECT id, category, address FROM businesses ORDER BY id");
    for (const g of GUIDES) {
      const inCat = shops.filter((s) => s.category === g.category);
      // 掲載店があるエリアのページだけ（空のページは載せない）
      for (const [key, a] of Object.entries(AREA_SLUGS)) {
        if (inCat.some((s) => areaOf(s.address)?.area.key === key)) pages.push({ url: `${APP_URL}/guide/${g.slug}/${a.slug}`, changeFrequency: "daily", priority: 0.8 });
      }
    }
    // よく検索される言葉のページは、掲載店（宿などの基本情報を含む）があるものだけ
    const themeShops = await Promise.all(THEMES.map(async (g) => (await guideShops(g)).length + (await guideListings(g)).length));
    THEMES.forEach((g, i) => {
      if (themeShops[i] > 0) pages.push({ url: `${APP_URL}/guide/${g.slug}`, changeFrequency: "daily", priority: 0.9 });
    });
    for (const s of shops) pages.push({ url: `${APP_URL}/shops/${s.id}`, changeFrequency: "weekly", priority: 0.7 });
    const events = await query<{ slug: string }>("SELECT slug FROM events WHERE is_published AND ends_on >= CURRENT_DATE ORDER BY starts_on");
    for (const e of events) pages.push({ url: `${APP_URL}/events/${e.slug}`, changeFrequency: "daily", priority: 0.9 });
  } catch {
    /* DB に届かないときは固定のページだけ */
  }
  return pages;
}

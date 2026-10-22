import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";
import { query } from "@/lib/db";

export const revalidate = 3600;

/**
 * 検索エンジンに渡すページの一覧（誰でも開けるページだけ）。
 * 地図のトップ・お店のページは会員向け（未登録なら会員登録画面へ移る）なので入れない。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/register/customer`, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/register/business`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${APP_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/tokushoho`, changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const events = await query<{ slug: string }>("SELECT slug FROM events WHERE is_published AND ends_on >= CURRENT_DATE ORDER BY starts_on");
    for (const e of events) pages.push({ url: `${APP_URL}/events/${e.slug}`, changeFrequency: "daily", priority: 0.9 });
  } catch {
    /* DB に届かないときは固定のページだけ */
  }
  return pages;
}

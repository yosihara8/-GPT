import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";

/** 検索エンジンに管理画面・マイページを載せない（お店の写真だけは画像検索のため許可） */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/", "/api/businesses/*/photo"], disallow: ["/admin", "/api", "/dashboard", "/upgrade"] }, sitemap: `${APP_URL}/sitemap.xml` };
}

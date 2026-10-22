import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";

/** 検索エンジンに管理画面・マイページを載せない */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/dashboard", "/upgrade"] }, sitemap: `${APP_URL}/sitemap.xml` };
}

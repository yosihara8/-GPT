import type { MetadataRoute } from "next";

/** 検索エンジンに管理画面・マイページを載せない */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/dashboard", "/upgrade"] } };
}

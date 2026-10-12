"use client";

import { usePathname } from "next/navigation";

/** 公開サイトのヘッダー・フッター。管理画面（/admin）では出さない（管理画面は独立した画面） */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}

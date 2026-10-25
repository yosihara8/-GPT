"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

/** 公開サイトのヘッダー・フッター。管理画面（/admin）では出さない（管理画面は独立した画面） */
export default function SiteChrome({ children, footer = false }: { children: React.ReactNode; footer?: boolean }) {
  const pathname = usePathname() ?? "";
  const { status } = useSession();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  // パソコンの地図の画面はアプリのように画面いっぱいで使うため、下のフッターは出さない（スマホは一覧の下に出す）
  // （登録前の方のトップは普通のページなので、フッターを出す）
  if (footer && pathname === "/" && status === "authenticated") return <div className="lg:hidden">{children}</div>;
  return <>{children}</>;
}

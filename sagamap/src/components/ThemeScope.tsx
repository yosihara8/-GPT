"use client";

import { usePathname } from "next/navigation";

export type Theme = "customer" | "business" | "admin";

const BUSINESS_PATHS = ["/dashboard/business", "/register/business", "/register/special", "/upgrade"];

/** URL から画面の種類を判定する（お客さま・事業主・管理者で色を変える） */
export function themeFor(pathname: string): Theme {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (BUSINESS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "business";
  return "customer";
}

export function useTheme(): Theme {
  return themeFor(usePathname() ?? "/");
}

/** 画面の種類に応じた配色（CSS 変数）を子要素に適用する */
export default function ThemeScope({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <div data-theme={theme} className="flex min-h-screen flex-col bg-cream">
      {children}
    </div>
  );
}

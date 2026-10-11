"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Eye } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "./ThemeScope";

export default function Header() {
  const { data } = useSession();
  const user = data?.user;
  const theme = useTheme();
  const dark = theme === "admin";
  const area = theme === "admin" ? "管理者" : theme === "business" ? "事業主" : null;
  const dashboard = user?.role === "business" ? "/dashboard/business" : "/dashboard/customer";
  // 管理画面へのリンクは管理画面の中だけに出す（お客さま・事業主の画面には置かない）
  // ロゴ（ホーム）は今いる画面の種類の中にとどまる
  const home =
    theme === "business" && user?.role === "business" ? "/dashboard/business" : theme === "admin" && user?.role === "admin" ? "/admin" : "/";
  const showDashboardLink = user && (user.role !== "admin" || theme === "admin");

  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur ${dark ? "border-slate-800 bg-slate-900/95" : "border-slate-200/80 bg-[#FFFDF9]/95"}`}>
      {user?.impersonated && (
        <div className="flex items-center justify-center gap-3 bg-slate-900 px-4 py-1.5 text-xs font-medium text-white">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          管理者として「{user.email}」の画面を表示中
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="rounded-md bg-white px-2.5 py-0.5 font-semibold text-slate-900"
          >
            管理画面に戻る
          </button>
        </div>
      )}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link href={home} className="flex min-w-0 items-center gap-2 sm:gap-2.5" aria-label="佐賀観光マップ ホームへ">
          <Logo light={dark} className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          <span className={`whitespace-nowrap font-mincho text-[15px] font-bold sm:text-lg sm:tracking-wider ${dark ? "text-white" : "text-slate-900"}`}>佐賀観光マップ</span>
          {area && (
            <span
              className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold ${dark ? "bg-saga-500 text-white" : "bg-sun-400 text-saga-900"}`}
            >
              {area}
            </span>
          )}
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-sm font-medium sm:gap-1">
          {user ? (
            <>
              {showDashboardLink && (
                <Link
                  href={user.role === "admin" ? "/admin" : dashboard}
                  className={`rounded-lg px-2 py-1.5 sm:px-3 ${dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {user.role === "admin" ? "管理画面" : "マイページ"}
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className={`rounded-lg px-2 py-1.5 sm:px-3 ${dark ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`rounded-lg px-2 py-1.5 sm:px-3 ${dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}>
                ログイン
              </Link>
              <Link href="/register/customer" className="btn-primary px-3.5 py-1.5">
                無料登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

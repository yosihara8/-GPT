"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Eye, Globe } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "./ThemeScope";
import { useLang } from "./LangProvider";

export default function Header() {
  const { data } = useSession();
  const pathname = usePathname() ?? "";
  const user = data?.user;
  const theme = useTheme();
  const { lang, setLang, t } = useLang();
  // 英語の切り替えは、お客さま向けの画面だけ（事業主・管理者の画面は日本語のみ）
  const showLang = theme !== "business" && theme !== "admin";
  const dark = theme === "admin";
  const area = theme === "admin" ? "管理者" : theme === "business" ? "事業主" : null;
  const dashboard = user?.role === "business" ? "/dashboard/business" : "/dashboard/customer";
  // 管理画面へのリンクは管理画面の中だけに出す（お客さま・事業主の画面には置かない）
  // ロゴ（ホーム）は今いる画面の種類の中にとどまる
  const home =
    theme === "business" && user?.role === "business" ? "/dashboard/business" : theme === "admin" && user?.role === "admin" ? "/admin" : "/";
  // 事業主の画面では、左（スマホは下）のメニューがあるので「マイページ」は出さない
  const showDashboardLink = user && user.role !== "admin" && !(user.role === "business" && theme === "business");

  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur ${dark ? "border-slate-800 bg-slate-900/95" : "border-slate-200/80 bg-[#FFFDF9]/95"}`}>
      {user?.impersonated && (
        <div className="flex items-center justify-center gap-3 bg-slate-900 px-4 py-1.5 text-xs font-medium text-white">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          管理者として「{user.email}」の画面を表示中
          <button
            onClick={() => signOut({ callbackUrl: "/admin" })}
            className="rounded-md bg-white px-2.5 py-0.5 font-semibold text-slate-900"
          >
            管理画面に戻る
          </button>
        </div>
      )}
      <div className={`mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:px-4 ${(theme === "business" && user?.role === "business") || pathname === "/" ? "lg:max-w-none lg:px-5" : "max-w-6xl"}`}>
        <Link href={home} className="flex min-w-0 items-center gap-2 sm:gap-2.5" aria-label={t("佐賀観光マップ ホームへ")}>
          <Logo light={dark} className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          <span
            className={`whitespace-nowrap font-mincho text-[14px] font-bold sm:text-lg sm:tracking-wider ${user ? "max-[374px]:hidden" : ""} ${dark ? "text-white" : "text-slate-900"}`}
          >
            {showLang ? t("佐賀観光マップ") : "佐賀観光マップ"}
          </span>
          {area && (
            <span
              className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold ${dark ? "bg-saga-500 text-white" : "bg-sun-400 text-saga-900"}`}
            >
              {area}
            </span>
          )}
        </Link>
        <nav className="ml-1 flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[13px] font-medium sm:ml-2 sm:gap-1 sm:text-sm">
          {showLang && (
            <button
              type="button"
              onClick={() => setLang(lang === "ja" ? "en" : "ja")}
              aria-label={lang === "ja" ? "Switch to English" : "日本語に切り替え"}
              className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              {lang === "ja" ? "EN" : "日本語"}
            </button>
          )}
          {user ? (
            <>
              {/* お客さまは「地図」と「マイページ」を切り替え。開いている方に色を付ける */}
              {user.role === "customer" && theme !== "admin" && (
                <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={tabClass(pathname === "/", dark)}>
                  {t("地図")}
                </Link>
              )}
              {showDashboardLink && (
                <Link
                  href={user.role === "admin" ? "/admin" : dashboard}
                  data-tour="mypage"
                  aria-current={pathname.startsWith(user.role === "admin" ? "/admin" : dashboard) ? "page" : undefined}
                  className={tabClass(pathname.startsWith(user.role === "admin" ? "/admin" : dashboard), dark)}
                >
                  {user.role === "business" ? "ダッシュボード" : t("マイページ")}
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className={`rounded-full px-2 py-1.5 sm:px-3 ${dark ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
              >
                {showLang ? t("ログアウト") : "ログアウト"}
              </button>
            </>
          ) : (
            <>
              <Link href={theme === "business" ? "/login?role=business" : "/login"} className={`rounded-full px-2 py-1.5 sm:px-3 ${dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}>
                {showLang ? t("ログイン") : "ログイン"}
              </Link>
              {/* 事業主の画面（事業主登録など）では、お客さまの登録ではなく事業主のログインを案内する */}
              {theme !== "business" && (
                <Link href="/register/customer" className="btn-primary px-3.5 py-1.5">
                  {t("無料登録")}
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/** ヘッダーのリンク。開いているページは色つき（藍の背景・白い文字）にする */
function tabClass(on: boolean, dark: boolean) {
  if (on) return `rounded-full px-2.5 py-1.5 font-bold sm:px-3.5 ${dark ? "bg-white text-slate-900" : "bg-saga-600 text-white"}`;
  return `rounded-full px-2 py-1.5 sm:px-3 ${dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`;
}

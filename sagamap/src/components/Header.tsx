"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Eye } from "lucide-react";
import Logo from "./Logo";

export default function Header() {
  const { data } = useSession();
  const user = data?.user;
  const dashboard =
    user?.role === "admin" ? "/admin" : user?.role === "business" ? "/dashboard/business" : "/dashboard/customer";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
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
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="SagaMap トップへ">
          <Logo className="h-8 w-8" />
          <span className="leading-tight">
            <span className="block text-[17px] font-bold tracking-tight text-slate-900">SagaMap</span>
            <span className="block text-[10px] font-medium text-slate-500">佐賀おでかけ AI マップ</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {user ? (
            <>
              <Link href={dashboard} className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                {user.role === "admin" ? "管理画面" : "マイページ"}
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100">
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">
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

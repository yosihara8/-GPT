"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data } = useSession();
  const user = data?.user;
  const dashboard =
    user?.role === "admin" ? "/admin" : user?.role === "business" ? "/dashboard/business" : "/dashboard/customer";

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur">
      {user?.impersonated && (
        <div className="flex items-center justify-center gap-3 bg-slate-900 px-4 py-1.5 text-xs font-bold text-white">
          👀 管理者として「{user.email}」の画面を表示中
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="rounded-full bg-white px-3 py-0.5 text-slate-900"
          >
            管理画面に戻る
          </button>
        </div>
      )}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="text-2xl transition group-hover:-translate-y-0.5" aria-hidden>
            🎈
          </span>
          <span className="leading-tight">
            <span className="block bg-gradient-to-r from-coral-500 via-sun-500 to-saga-500 bg-clip-text text-lg font-extrabold text-transparent">
              SagaMap
            </span>
            <span className="block text-[10px] font-bold tracking-wider text-slate-500">佐賀おでかけ AI マップ</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1.5 text-sm font-bold">
          {user ? (
            <>
              <Link href={dashboard} className="rounded-full px-3 py-1.5 text-saga-700 hover:bg-saga-50">
                {user.role === "admin" ? "管理画面" : "マイページ"}
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-full px-3 py-1.5 text-slate-500 hover:bg-slate-100">
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-1.5 text-saga-700 hover:bg-saga-50">
                ログイン
              </Link>
              <Link href="/register/customer" className="btn-primary px-4 py-1.5">
                無料登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

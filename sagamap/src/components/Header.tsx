"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data } = useSession();
  const user = data?.user;
  const dashboard = user?.role === "business" ? "/dashboard/business" : "/dashboard/customer";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
      <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-saga-700">
        <span aria-hidden>📍</span>SagaMap
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        {user ? (
          <>
            <Link href={dashboard} className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100">
              マイページ
            </Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
              ログアウト
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100">
              ログイン
            </Link>
            <Link href="/register/customer" className="btn-primary px-3 py-1.5">
              無料登録
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

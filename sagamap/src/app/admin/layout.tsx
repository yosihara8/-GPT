"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";

/**
 * 管理画面の枠（公開サイトのヘッダー・フッターとは別。運営者専用）。
 * ログイン・パスワード再設定の画面は、ロゴだけの簡素な枠。
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const open = pathname === "/admin/login" || pathname.startsWith("/admin/forgot");
  const [me, setMe] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    if (open) return;
    fetch("/api/admin/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.admin ?? null))
      .catch(() => setMe(null));
  }, [open]);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- ログインの Cookie を確実に反映させるため、画面を読み込み直す
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <span className="flex items-center gap-2">
            <Logo light className="h-7 w-7" />
            <span className="font-mincho font-bold">佐賀観光マップ</span>
            <span className="flex items-center gap-1 rounded-md bg-saga-500 px-2 py-0.5 text-[11px] font-bold">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              運営者専用
            </span>
          </span>
          {!open && (
            <nav className="flex items-center gap-1 text-sm">
              {me && <span className="hidden text-slate-400 sm:inline">{me.email}</span>}
              <Link href="/" target="_blank" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-300 hover:bg-slate-800">
                <ExternalLink className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">サイトを見る</span>
              </Link>
              <button type="button" onClick={logout} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-300 hover:bg-slate-800">
                <LogOut className="h-4 w-4" aria-hidden />
                ログアウト
              </button>
            </nav>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

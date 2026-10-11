"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CreditCard, Home, Megaphone, TicketPercent, Users } from "lucide-react";

const ITEMS = [
  { href: "/dashboard/business", label: "ホーム", icon: Home },
  { href: "/dashboard/business/coupons", label: "クーポン", icon: TicketPercent },
  { href: "/dashboard/business/ads", label: "広告", icon: Megaphone },
  { href: "/dashboard/business/referrals", label: "紹介", icon: Users },
  { href: "/upgrade", label: "プラン", icon: CreditCard },
];

function isOn(pathname: string, href: string) {
  return href === "/dashboard/business" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** 事業主のメニュー（パソコンは左側に常に表示、スマホは画面下のタブ） */
export default function BusinessNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { data } = useSession();
  const show = data?.user?.role === "business";

  return (
    <div className="lg:flex">
      {show && (
        <aside className="hidden lg:block lg:w-56 lg:shrink-0">
          <nav className="karakusa sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col gap-1 bg-saga-600 p-3 text-sm">
            {ITEMS.map(({ href, label, icon: Icon }) => {
              const on = isOn(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-bold transition ${on ? "bg-white/15 text-white ring-1 ring-sun-400/60" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon className={`h-4 w-4 ${on ? "text-sun-400" : ""}`} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}
      <div className="min-w-0 flex-1">
        {children}
        {show && (
          <nav className="sticky bottom-0 z-20 flex border-t border-slate-200 bg-[#FFFDF9]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
            {ITEMS.map(({ href, label, icon: Icon }) => {
              const on = isOn(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[10.5px] ${on ? "font-bold text-saga-600" : "text-slate-400"}`}
                >
                  {on && <span className="absolute top-0 h-[3px] w-6 rounded-b bg-sun-400" aria-hidden />}
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-[#FFFDF9] px-4 py-8 text-xs text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <Logo className="h-5 w-5" />
          <b className="shrink-0 whitespace-nowrap font-mincho text-sm text-slate-800">佐賀観光マップ</b> — 佐賀のお店と、旅する人をつなぐ観光マップ
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-slate-900">利用規約</Link>
          <Link href="/privacy" className="hover:text-slate-900">プライバシーポリシー</Link>
          <Link href="/tokushoho" className="hover:text-slate-900">特定商取引法に基づく表記</Link>
          <Link href="/register/business" className="hover:text-slate-900">お店の方へ</Link>
        </nav>
      </div>
    </footer>
  );
}

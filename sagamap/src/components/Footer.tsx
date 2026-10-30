"use client";

import Link from "next/link";
import { useT } from "./LangProvider";
import Logo from "./Logo";

export default function Footer() {
  const t = useT();
  return (
    <footer className="mt-10 border-t border-slate-200 bg-[#FFFDF9] px-4 py-8 text-xs text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <p className="flex items-center gap-2">
          <Logo className="h-5 w-5" />
          <b className="shrink-0 whitespace-nowrap font-mincho text-sm text-slate-800">{t("佐賀観光マップ")}</b> — {t("佐賀のお店と、旅する人をつなぐ観光マップ")}
        </p>
        <nav aria-label="お店さがし" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/guide" className="font-bold text-slate-700 hover:text-slate-900">{t("佐賀観光のお店さがし")}</Link>
          <Link href="/guide/gourmet" className="hover:text-slate-900">{t("佐賀グルメ")}</Link>
          <Link href="/guide/lunch" className="hover:text-slate-900">{t("ランチ")}</Link>
          <Link href="/guide/cafe" className="hover:text-slate-900">{t("カフェ")}</Link>
          <Link href="/guide/sagagyu" className="hover:text-slate-900">{t("佐賀牛")}</Link>
          <Link href="/guide/karatsu-yobuko" className="hover:text-slate-900">{t("唐津・呼子のいか")}</Link>
          <Link href="/guide/ureshino" className="hover:text-slate-900">{t("嬉野温泉")}</Link>
          <Link href="/guide/takeo" className="hover:text-slate-900">{t("武雄温泉")}</Link>
          <Link href="/guide/arita" className="hover:text-slate-900">{t("有田焼")}</Link>
          <Link href="/guide/souvenir" className="hover:text-slate-900">{t("お土産")}</Link>
          <Link href="/guide/stay" className="hover:text-slate-900">{t("宿・温泉")}</Link>
        </nav>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-slate-900">{t("利用規約")}</Link>
          <Link href="/privacy" className="hover:text-slate-900">{t("プライバシーポリシー")}</Link>
          <Link href="/tokushoho" className="hover:text-slate-900">{t("特定商取引法に基づく表記")}</Link>
          <Link href="/contact" className="hover:text-slate-900">{t("お問い合わせ")}</Link>
          <Link href="/register/business" className="hover:text-slate-900">{t("お店の方へ")}</Link>
        </nav>
      </div>
    </footer>
  );
}

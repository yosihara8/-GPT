"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, ChevronDown, KeyRound, Mail, MessageCircle, UserX } from "lucide-react";
import { AreaMark } from "@/components/customer/Carousel";
import EmailChangeForm from "@/components/EmailChangeForm";
import DeleteAccount from "@/components/DeleteAccount";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import NotifySetting from "@/components/NotifySetting";

/**
 * お客さまの設定（マイページから「設定」で開く別ページ）。
 * どの項目も最初は閉じておき、押したときだけ開く。
 * 退会はいちばん下に小さく置く（いつでも目に入ると、すぐ退会されてしまうため。オーナー決定）。
 */
export default function CustomerSettingsPage() {
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  // お知らせから「メールの設定」で来たときは、その項目を開いておく
  const open = useSearchParams().get("open");
  return (
    <main className="mx-auto max-w-2xl px-5 pb-12 pt-5">
      <Link href="/dashboard/customer" className="inline-flex items-center gap-1 text-sm font-bold text-saga-600">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        マイページに戻る
      </Link>
      <AreaMark className="mb-2 mt-6" />
      <h1 className="font-mincho text-[26px] font-bold leading-snug tracking-[0.08em] text-slate-900">設定</h1>
      <p className="mt-1 text-xs text-slate-500">見たい項目を押すと開きます。</p>

      <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
        <Fold icon={Bell} title="お知らせメール" sub="新着クーポンのまとめメールの受け取り" defaultOpen={open === "notify"}>
          <NotifySetting />
        </Fold>
        <Fold icon={Mail} title="メールアドレスの変更" sub="ログインに使うメールアドレス">
          <EmailChangeForm />
        </Fold>
        <Fold icon={KeyRound} title="パスワードの変更" sub="ログインに使うパスワード">
          <PasswordChangeForm />
        </Fold>
        <Link href="/contact" className="flex items-center gap-3 py-4">
          <MessageCircle className="h-5 w-5 shrink-0 text-saga-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-slate-900">お問い合わせ</span>
            <span className="block text-xs text-slate-500">使い方・クーポン・個人情報のご請求など</span>
          </span>
          <ChevronDown className="h-4 w-4 -rotate-90 text-slate-400" aria-hidden />
        </Link>
      </div>

      <div className="mt-10">
        <Fold icon={UserX} title="退会について" sub="アカウントの削除" small>
          <DeleteAccount />
        </Fold>
      </div>
    </main>
  );
}

/** 押すと開く項目（最初は閉じている） */
function Fold({
  icon: Icon,
  title,
  sub,
  children,
  defaultOpen = false,
  small = false,
}: {
  icon: typeof Bell;
  title: string;
  sub: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  small?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`flex w-full items-center gap-3 text-left ${small ? "py-2" : "py-4"}`}>
        <Icon className={`shrink-0 ${small ? "h-4 w-4 text-slate-400" : "h-5 w-5 text-saga-600"}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={`block ${small ? "text-xs text-slate-500" : "font-bold text-slate-900"}`}>{title}</span>
          {!small && <span className="block text-xs text-slate-500">{sub}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

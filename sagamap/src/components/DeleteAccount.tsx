"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { api } from "@/lib/fetcher";
import PasswordInput from "@/components/PasswordInput";

/** お客さまの退会（マイページの設定のいちばん下。取り消しできないため、注意と本人確認を通す） */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open && hasPassword === null) api<{ hasPassword: boolean }>("/api/account/delete").then((d) => setHasPassword(d.hasPassword)).catch(() => setHasPassword(true));
  }, [open, hasPassword]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree) return;
    if (!confirm("退会すると、元に戻すことはできません。本当に退会しますか？")) return;
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await api("/api/account/delete", { method: "POST", body: JSON.stringify({ password: f.get("password") || undefined, confirmText: f.get("confirmText") || undefined }) });
      setDone(true);
      setTimeout(() => signOut({ callbackUrl: "/login?deleted=1" }), 2500);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section className="card text-center" role="status">
        <p className="font-bold">退会の手続きが完了しました</p>
        <p className="mt-1 text-sm text-slate-600">これまでご利用いただき、ありがとうございました。自動でログアウトします。</p>
      </section>
    );
  }

  return (
    <section className="card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block font-bold">退会する</span>
          <span className="block text-xs text-slate-500">アカウントを削除して、佐賀観光マップの利用をやめます</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <div role="alert" className="space-y-2 rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-sm text-red-800">
            <p className="flex items-center gap-2 font-bold text-red-700">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
              退会すると元に戻せません
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>お名前・メールアドレス・パスワード・お気に入り・お知らせは削除され、このアカウントでログインできなくなります。</li>
              <li>使ったクーポンの回数などは、お店の集計のために、どなたか分からない形で残ります。</li>
              <li>お知らせメールも届かなくなります（メールだけ止めたい場合は、上の「お知らせメール」の設定で止められます）。</li>
              <li>同じメールアドレスで、あとから新しく登録し直すことはできます。</li>
            </ul>
          </div>
          {hasPassword === false ? (
            <div>
              <label className="label" htmlFor="confirmText">
                確認のため「退会する」と入力してください
              </label>
              <input id="confirmText" name="confirmText" required className="input" autoComplete="off" />
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="delete-password">
                本人確認のため、今のパスワードを入力してください
              </label>
              <PasswordInput id="delete-password" name="password" required autoComplete="current-password" className="input" />
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-bold">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-red-600" />
            上の内容を理解し、退会します
          </label>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
          <button disabled={!agree || loading} className="btn btn-lg bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-40">
            {loading ? "手続きしています…" : "退会する（元に戻せません）"}
          </button>
        </form>
      )}
    </section>
  );
}

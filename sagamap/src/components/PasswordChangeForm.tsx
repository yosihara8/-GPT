"use client";

import PasswordInput from "@/components/PasswordInput";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { api } from "@/lib/fetcher";

/** ログインし直す画面（運営者は運営者用） */
const loginUrl = (role?: string) => (role === "admin" ? "/admin/login" : role === "business" ? "/login?role=business" : "/login");

export default function PasswordChangeForm({ minLength = 8 }: { minLength?: number }) {
  const { data } = useSession();
  const role = data?.user?.role;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (f.next !== f.next2) return setMsg({ ok: false, text: "確認用のパスワードが一致しません" });
    try {
      await api("/api/account/password", { method: "POST", body: JSON.stringify({ current: f.current, next: f.next }) });
      form.reset();
      // パスワードを変えると、この端末を含むすべての端末のログインが切れる（盗まれたログインも使えなくなる）
      setMsg({ ok: true, text: "パスワードを変更しました。安全のため、すべての端末でログアウトしました。新しいパスワードでログインしてください。" });
      setTimeout(() => signOut({ callbackUrl: loginUrl(role) }), 2500);
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  async function logoutAll() {
    if (!confirm("この端末を含め、ログインしているすべての端末（スマホ・パソコン）からログアウトします。よろしいですか？")) return;
    try {
      await api("/api/account/logout-all", { method: "POST" });
      await signOut({ callbackUrl: loginUrl(role) });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  return (
    <div className="card space-y-3">
      <form onSubmit={onSubmit} className="space-y-3">
        <h2 className="font-bold">パスワードの変更</h2>
        <PasswordInput name="current" required placeholder="現在のパスワード" autoComplete="current-password" className="input" />
        <PasswordInput
          name="next"
         
          required
          minLength={minLength}
          placeholder={`新しいパスワード（${minLength} 文字以上）`}
          autoComplete="new-password"
          className="input"
        />
        <PasswordInput name="next2" required minLength={minLength} placeholder="新しいパスワード（確認）" autoComplete="new-password" className="input" />
        <p className="text-xs text-slate-500">ほかのサービスと同じパスワードは使わないでください（使い回しが乗っ取りのいちばんの原因です）。</p>
        {msg && <p className={`text-sm ${msg.ok ? "text-tea-700" : "text-red-600"}`}>{msg.text}</p>}
        <button className="btn-primary w-full">変更する</button>
      </form>
      <div className="border-t border-slate-100 pt-3">
        <button type="button" onClick={logoutAll} className="btn-outline w-full">
          <LogOut className="h-4 w-4" aria-hidden />
          すべての端末からログアウト
        </button>
        <p className="mt-1 text-xs text-slate-500">スマホをなくしたとき、知らない端末でログインされたかもしれないときに使います。</p>
      </div>
    </div>
  );
}

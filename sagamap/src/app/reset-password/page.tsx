"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/fetcher";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (f.password !== f.password2) return setError("確認用のパスワードが一致しません");
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ role: string }>("/api/account/reset", {
        method: "POST",
        body: JSON.stringify({ token, password: f.password }),
      });
      setDone(res.role === "admin" ? "/admin/login" : `/login?role=${res.role}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mt-4 text-2xl font-extrabold">🔑 新しいパスワードの設定</h1>
      {done ? (
        <div className="card mt-4 text-center">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 font-bold">パスワードを変更しました</p>
          <Link href={done} className="btn-primary mt-4 w-full">
            ログインする
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="password">新しいパスワード（8 文字以上）</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password2">新しいパスワード（確認）</label>
            <input id="password2" name="password2" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading || !token} className="btn-primary w-full">
            {loading ? "設定中…" : "パスワードを設定する"}
          </button>
          {!token && <p className="text-sm text-red-600">リンクが正しくありません。メールのリンクから開いてください。</p>}
        </form>
      )}
    </main>
  );
}

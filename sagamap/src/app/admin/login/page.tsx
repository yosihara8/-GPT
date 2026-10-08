"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/** 運営者ログイン */
export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: f.get("email"),
      password: f.get("password"),
      role: "admin",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "メールアドレスまたはパスワードが正しくありません" : res.error);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mt-4 text-2xl font-bold">運営者ログイン</h1>
      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" required autoComplete="username" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">パスワード</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "ログイン中…" : "ログイン"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        運営者が未登録の場合は <Link href="/admin/setup" className="underline">初期設定</Link> から作成してください。
      </p>
    </main>
  );
}

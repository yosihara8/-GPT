"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

/** 最初の運営者アカウントの作成（運営者が 1 人もいないときだけ使える） */
export default function AdminSetupPage() {
  const router = useRouter();
  const [needed, setNeeded] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ needed: boolean }>("/api/admin/setup").then((d) => setNeeded(d.needed));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (f.password !== f.password2) return setError("確認用のパスワードが一致しません");
    setLoading(true);
    setError(null);
    try {
      await api("/api/admin/setup", { method: "POST", body: JSON.stringify(f) });
      await signIn("credentials", { email: f.email, password: f.password, role: "admin", redirect: false });
      router.push("/admin");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (needed === null) return <main className="p-4 text-sm text-slate-500">読み込み中…</main>;
  if (!needed) {
    return (
      <main className="mx-auto max-w-md p-4">
        <h1 className="mt-4 text-xl font-bold">初期設定は完了しています</h1>
        <p className="mt-2 text-sm text-slate-600">運営者はすでに登録されています。</p>
        <Link href="/admin/login" className="btn-primary mt-4 w-full">
          運営者ログインへ
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mt-4 text-2xl font-bold">運営者アカウントの作成</h1>
      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        最初の 1 人だけ、このページから作成できます。作成した時点でこのページは使えなくなります。
      </p>
      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="name">名前</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" required autoComplete="username" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">パスワード（12 文字以上）</label>
          <input id="password" name="password" type="password" required minLength={12} autoComplete="new-password" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password2">パスワード（確認）</label>
          <input id="password2" name="password2" type="password" required minLength={12} autoComplete="new-password" className="input" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "作成中…" : "運営者アカウントを作成"}
        </button>
      </form>
    </main>
  );
}

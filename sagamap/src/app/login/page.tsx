"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<"customer" | "business">(params.get("role") === "business" ? "business" : "customer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const callbackUrl = safeCallback(params.get("callbackUrl"), role);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      role,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) setError("メールアドレスまたはパスワードが正しくありません");
    else router.push(callbackUrl);
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mt-4 text-2xl font-bold">ログイン</h1>
      <div className="mt-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
        {(["customer", "business"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-md py-2 ${role === r ? "bg-white font-semibold shadow" : "text-slate-500"}`}
          >
            {r === "customer" ? "お客さま" : "事業主"}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">パスワード</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "ログイン中…" : "ログイン"}
        </button>
        {role === "customer" && (
          <button type="button" onClick={() => signIn("google", { callbackUrl })} className="btn-outline w-full">
            Google でログイン
          </button>
        )}
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        はじめての方は{" "}
        <Link className="text-saga-600 underline" href={role === "business" ? "/register/business" : "/register/customer"}>
          {role === "business" ? "事業主登録" : "会員登録"}
        </Link>
      </p>
    </main>
  );
}

/** オープンリダイレクト防止: サイト内パスのみ許可 */
function safeCallback(url: string | null, role: string) {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return role === "business" ? "/dashboard/business" : "/dashboard/customer";
}

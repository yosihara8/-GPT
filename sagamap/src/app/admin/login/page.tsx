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
  // 二段階認証を設定済みなら、パスワードのあとに認証アプリの 6 桁を聞く
  const [needOtp, setNeedOtp] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: f.get("email"),
      password: f.get("password"),
      role: "admin",
      otp: f.get("otp") ?? "",
      redirect: false,
    });
    setLoading(false);
    if (res?.error === "OTP_REQUIRED") {
      setNeedOtp(true);
      setError("認証アプリに表示されている 6 桁の数字を入れてください");
    } else if (res?.error === "OTP_INVALID") {
      setNeedOtp(true);
      setError("6 桁の数字が違うか、時間切れです。最新の数字を入れてください");
    } else if (res?.error) {
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
        {needOtp && (
          <div>
            <label className="label" htmlFor="otp">
              確認コード（認証アプリの 6 桁）
            </label>
            <input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              className="input num text-center text-2xl tracking-[0.4em]"
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "ログイン中…" : "ログイン"}
        </button>
      </form>
    </main>
  );
}

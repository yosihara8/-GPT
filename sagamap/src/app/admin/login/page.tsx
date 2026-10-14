"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

/** 運営者ログイン（管理画面専用。お客さま・事業主のログインとは別） */
export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 二段階認証を設定済みなら、パスワードのあとに認証アプリの 6 桁を聞く
  const [needOtp, setNeedOtp] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.get("email"), password: f.get("password"), otp: f.get("otp") || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- ログインの Cookie を確実に反映させるため、画面を読み込み直す
        window.location.href = "/admin";
        return;
      }
      if (d.otpRequired) setNeedOtp(true);
      setError(d.error ?? "ログインできませんでした");
    } catch {
      setError("通信できませんでした。電波の良いところでもう一度お試しください");
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mt-6 flex items-center gap-2 text-2xl font-bold">
        <Lock className="h-6 w-6 text-saga-600" aria-hidden />
        運営者ログイン
      </h1>
      <p className="mt-1 text-sm text-slate-500">この画面は運営者専用です。</p>
      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            メールアドレス
          </label>
          <input id="email" name="email" type="email" required autoComplete="username" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            パスワード
          </label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" />
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
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button disabled={loading} className="btn-primary btn-lg">
          {loading ? "ログイン中…" : "ログイン"}
        </button>
        <p className="text-right text-sm">
          <Link href="/admin/forgot" className="font-bold text-saga-600 underline">
            パスワードを忘れた方
          </Link>
        </p>
      </form>
    </main>
  );
}

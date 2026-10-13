"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound } from "lucide-react";

/** 運営者のパスワード再設定（運営者のメールアドレスに再設定のリンクを送る） */
export default function AdminForgotPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      const res = await fetch("/api/admin/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "送れませんでした");
      else if (d.mailEnabled === false) setError("メールの送信がまだ設定されていません");
      else setSent(email);
    } catch {
      setError("通信できませんでした");
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mt-6 flex items-center gap-2 text-2xl font-bold">
        <KeyRound className="h-6 w-6 text-saga-600" aria-hidden />
        パスワードの再設定
      </h1>
      {sent ? (
        <div className="card mt-4 space-y-3">
          <p className="text-sm">
            <b>{sent}</b> が運営者のメールアドレスなら、再設定のリンクを送りました（1 時間有効・1 回限り）。メールのボタンから新しいパスワードを設定してください。
          </p>
          <p className="text-xs text-slate-500">届かないときは、迷惑メールのフォルダも確認してください。二段階認証を設定している場合は、再設定後もスマホの 6 桁が必要です。</p>
          <Link href="/admin/login" className="btn-primary w-full">
            ログイン画面へ
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card mt-4 space-y-4">
          <p className="text-sm text-slate-600">運営者のメールアドレスを入れてください。パスワードを決め直すためのリンクをお送りします。</p>
          <div>
            <label className="label" htmlFor="email">
              メールアドレス
            </label>
            <input id="email" name="email" type="email" required autoComplete="username" className="input" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn-primary btn-lg">
            {loading ? "送信中…" : "再設定のリンクを送る"}
          </button>
          <p className="text-right text-sm">
            <Link href="/admin/login" className="text-saga-600 underline">
              ログイン画面に戻る
            </Link>
          </p>
        </form>
      )}
    </main>
  );
}

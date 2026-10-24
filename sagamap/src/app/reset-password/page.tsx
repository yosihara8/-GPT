"use client";

import PasswordInput from "@/components/PasswordInput";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useT } from "@/components/LangProvider";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useT();
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (f.password !== f.password2) return setError(t("確認用のパスワードが一致しません"));
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
      <h1 className="mt-4 text-2xl font-bold">{t("新しいパスワードの設定")}</h1>
      {done ? (
        <div className="card mt-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tea-50 text-tea-600" aria-hidden><CircleCheck className="h-7 w-7" /></span>
          <p className="mt-2 font-bold">{t("パスワードを変更しました")}</p>
          <Link href={done} className="btn-primary mt-4 w-full">
            {t("ログインする")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="password">{t("新しいパスワード（8 文字以上）")}</label>
            <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password2">{t("新しいパスワード（確認）")}</label>
            <PasswordInput id="password2" name="password2" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading || !token} className="btn-primary btn-lg">
            {loading ? t("設定中…") : t("パスワードを設定する")}
          </button>
          {!token && <p className="text-sm text-red-600">{t("リンクが正しくありません。メールのリンクから開いてください。")}</p>}
        </form>
      )}
    </main>
  );
}

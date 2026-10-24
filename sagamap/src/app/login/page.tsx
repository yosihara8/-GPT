"use client";

import PasswordInput from "@/components/PasswordInput";
import Link from "next/link";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useGoogleSignInAvailable } from "@/hooks/useGoogleSignIn";
import { useRouter, useSearchParams } from "next/navigation";
import SagaHero from "@/components/SagaHero";
import { useT } from "@/components/LangProvider";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useT();
  const params = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<"customer" | "business">(params.get("role") === "business" ? "business" : "customer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleAvailable = useGoogleSignInAvailable();
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
    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? t("メールアドレスまたはパスワードが正しくありません") : res.error);
    }
    else router.push(callbackUrl);
  }

  return (
    <main className="mx-auto max-w-md sm:p-4">
      <SagaHero className="sm:rounded-3xl" eyebrow={t("佐賀観光マップ")} title={t("ログイン")} />
      <div className="relative -mt-4 px-4 sm:px-0">
      <div className="grid grid-cols-2 rounded-xl bg-white p-1 text-sm shadow-pop">
        {(["customer", "business"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-lg py-2 ${role === r ? "bg-saga-600 font-bold text-white" : "text-slate-500"}`}
          >
            {r === "customer" ? t("お客さま") : t("事業主")}
          </button>
        ))}
      </div>
      {params.get("deleted") && (
        <p role="status" className="mt-4 rounded-2xl bg-tea-50 px-4 py-3 text-sm font-bold text-tea-700">
          {t("退会の手続きが完了しました。これまでご利用いただき、ありがとうございました。")}
        </p>
      )}
      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="email">{t("メールアドレス")}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("パスワード")}</label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" className="input" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-right text-xs">
          <Link href="/forgot-password" className="font-bold text-saga-600 underline">
            {t("パスワードを忘れた方")}
          </Link>
        </p>
        <button disabled={loading} className="btn-primary btn-lg">
          {loading ? t("ログイン中…") : t("ログイン")}
        </button>
        {role === "customer" && googleAvailable && (
          <button type="button" onClick={() => signIn("google", { callbackUrl })} className="btn-outline w-full">
            {t("Google でログイン")}
          </button>
        )}
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        {t("はじめての方は")}{" "}
        <Link className="text-saga-600 underline" href={role === "business" ? "/register/business" : "/register/customer"}>
          {role === "business" ? t("事業主登録") : t("会員登録")}
        </Link>
      </p>
      </div>
    </main>
  );
}

/** オープンリダイレクト防止: サイト内パスのみ許可 */
function safeCallback(url: string | null, role: string) {
  const safe = url && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\") ? url : null;
  if (role === "business") return safe ?? "/dashboard/business";
  // お客さまはログイン後、まず地図の画面へ。お店・クーポンを指したリンク（お知らせ・共有）のときだけ、その画面へ
  if (safe && (/^\/\?shop=\d+/.test(safe) || /^\/shops\/\d+/.test(safe) || /^\/events\/[a-z0-9-]+$/.test(safe) || /^\/dashboard\/customer\/coupons\/\d+/.test(safe))) return safe;
  return "/";
}

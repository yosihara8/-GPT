"use client";

import { Opt, RegisterNotice, Req } from "@/components/FormMarks";
import PasswordInput from "@/components/PasswordInput";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useGoogleSignInAvailable } from "@/hooks/useGoogleSignIn";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/config";
import { api } from "@/lib/fetcher";
import SagaHero from "@/components/SagaHero";
import { useT } from "@/components/LangProvider";

export default function CustomerRegisterPage() {
  return (
    <Suspense>
      <CustomerRegisterForm />
    </Suspense>
  );
}

function CustomerRegisterForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const ref = Number(params.get("ref")) || undefined;
  const nextRaw = params.get("next");
  // お店からの紹介（SNS の投稿・紹介リンク）で来た方は、登録後にそのお店のページを開く
  const next = nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.includes("\\") ? nextRaw : ref ? `/?shop=${ref}` : "/";
  const [referrer, setReferrer] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleAvailable = useGoogleSignInAvailable();

  useEffect(() => {
    if (!ref) return;
    api<{ business: { name: string } }>("/api/referrals", { method: "POST", body: JSON.stringify({ bizId: ref }) })
      .then((d) => setReferrer(d.business.name))
      .catch(() => setReferrer(null));
  }, [ref]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      await api("/api/register/customer", {
        method: "POST",
        body: JSON.stringify({
          name: f.name,
          email: f.email,
          password: f.password,
          interests,
          ref,
          notifyEnabled: f.notifyEnabled === "on",
        }),
      });
      await signIn("credentials", { email: f.email, password: f.password, role: "customer", redirect: false });
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const toggle = (c: string) => setInterests((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));

  return (
    <main className="mx-auto max-w-lg sm:p-4">
      <SagaHero
        eyebrow={t("佐賀観光マップ")}
        className="sm:rounded-3xl"
        title={
          <>
            {t("会員登録")}<span className="text-lg">{t("（無料）")}</span>
          </>
        }
        lead={t("近くのクーポン・お店さがし・道順の案内が、すべて無料で使えます。")}
      />
      <div className="relative -mt-4 px-4 sm:px-0">
      {referrer && (
        <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-saga-700 shadow-pop">{t("「{r}」からのご紹介です", { r: referrer })}</p>
      )}
      <form onSubmit={onSubmit} className="card space-y-4 p-5">
        <RegisterNotice />
        <div>
          <label className="label" htmlFor="name">{t("名前")}<Req /></label>
          <input id="name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">{t("メールアドレス")}<Req /></label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("パスワード（8 文字以上）")}<Req /></label>
          <PasswordInput id="password" name="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
        <fieldset>
          <legend className="label">{t("興味のある業種（複数選択可）")}<Opt /></legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => toggle(c)} className={interests.includes(c) ? "chip-on" : "chip-off"}>
                {t(c)}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-2 rounded-2xl bg-saga-50 p-3 text-sm">
          <input type="checkbox" name="notifyEnabled" defaultChecked className="mt-0.5 h-5 w-5 accent-saga-600" />
          <span>
            <b>{t("お得なお知らせメールを受け取る")}</b>
            <br />
            <span className="text-xs text-slate-600">{t("毎週金曜日に、新着クーポン・お店のお知らせをまとめてお届けします。いつでも配信停止できます。")}</span>
          </span>
        </label>
        <p className="text-xs text-slate-500">
          {t("登録すると、")}<Link href="/terms" className="underline">{t("利用規約")}</Link>{t("と")}
          <Link href="/privacy" className="underline">{t("プライバシーポリシー")}</Link>{t("に同意したものとみなします。")}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-accent btn-lg">
          {loading ? t("登録中…") : t("無料で登録する")}
        </button>
        {googleAvailable && (
          <button type="button" onClick={() => signIn("google", { callbackUrl: next })} className="btn-outline w-full">
            {t("Google で登録")}
          </button>
        )}
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        {t("登録済みの方は")} <Link className="text-saga-600 underline" href={next === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(next)}`}>{t("ログイン")}</Link>
        {"　"}{t("お店の方は")} <Link className="text-saga-600 underline" href="/register/business">{t("事業主登録")}</Link>
      </p>
      </div>
    </main>
  );
}

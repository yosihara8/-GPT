"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useGoogleSignInAvailable } from "@/hooks/useGoogleSignIn";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/config";
import { api } from "@/lib/fetcher";

export default function CustomerRegisterPage() {
  return (
    <Suspense>
      <CustomerRegisterForm />
    </Suspense>
  );
}

function CustomerRegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = Number(params.get("ref")) || undefined;
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
        body: JSON.stringify({ name: f.name, email: f.email, password: f.password, interests, ref }),
      });
      await signIn("credentials", { email: f.email, password: f.password, role: "customer", redirect: false });
      router.push("/dashboard/customer");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const toggle = (c: string) => setInterests((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="mt-4 text-2xl font-bold">会員登録（無料）</h1>
      <p className="mt-1 text-sm text-slate-600">クーポン検索・AI おすすめ・徒歩ルート案内が使えるようになります。</p>
      {referrer && (
        <p className="mt-3 rounded-lg bg-saga-50 px-3 py-2 text-sm text-saga-700">「{referrer}」からのご紹介です</p>
      )}
      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="name">名前</label>
          <input id="name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">パスワード（8 文字以上）</label>
          <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
        <fieldset>
          <legend className="label">興味のある業種（任意・複数選択可）</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => toggle(c)} className={interests.includes(c) ? "chip-on" : "chip-off"}>
                {c}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "登録中…" : "無料で登録する"}
        </button>
        {googleAvailable && (
          <button type="button" onClick={() => signIn("google", { callbackUrl: "/dashboard/customer" })} className="btn-outline w-full">
            Google で登録
          </button>
        )}
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        登録済みの方は <Link className="text-saga-600 underline" href="/login">ログイン</Link>
        {"　"}お店の方は <Link className="text-saga-600 underline" href="/register/business">事業主登録</Link>
      </p>
    </main>
  );
}

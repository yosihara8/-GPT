"use client";

import PasswordInput from "@/components/PasswordInput";
import SagaHero from "@/components/SagaHero";
import { Opt, RegisterNotice, Req } from "@/components/FormMarks";
import Link from "next/link";
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CATEGORIES, PRICE_OPTIONS } from "@/lib/config";
import { api, ApiError } from "@/lib/fetcher";

/** 事業主登録フォーム。inviteCode があれば特別プラン（有料機能を無料で利用）で登録する */
export default function BusinessRegisterForm({ inviteCode }: { inviteCode?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAddressError(null);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      await api("/api/register/business", {
        method: "POST",
        body: JSON.stringify({
          name: f.name,
          address: f.address,
          serviceDescription: f.serviceDescription,
          contact: f.contact,
          category: f.category,
          priceLevel: f.priceLevel,
          email: f.email,
          password: f.password,
          ...(inviteCode ? { inviteCode } : {}),
        }),
      });
      await signIn("credentials", { email: f.email, password: f.password, role: "business", redirect: false });
      router.push("/dashboard/business?welcome=1");
    } catch (err) {
      if (err instanceof ApiError && err.data.field === "address") {
        // 住所から場所が見つからないときは、住所を入力し直してもらう
        setAddressError(err.message);
        addressRef.current?.focus();
        addressRef.current?.select();
        addressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg sm:p-4">
      {inviteCode ? (
        <div className="karakusa overflow-hidden bg-saga-600 p-5 pb-8 text-white sm:rounded-3xl">
          <p className="text-xs font-bold tracking-widest text-sun-100">特別招待</p>
          <h1 className="mt-1 text-2xl font-bold">特別招待 事業主登録</h1>
          <p className="mt-2 text-sm font-bold leading-6">
            運営からのご紹介で、<span className="rounded bg-white/25 px-1">有料プランのすべての機能を無料</span>で、期限なしでずっとご利用いただけます。
          </p>
          <ul className="mt-2 space-y-0.5 text-sm">
            <li>✓ クーポン発行　✓ 広告出稿（月 2 回）</li>
            <li>✓ SNS 連携　✓ 紹介プログラム　✓ 複数店舗の登録</li>
          </ul>
          <p className="mt-2 text-xs opacity-90">※ お支払い情報の登録は不要です。あとから無料プラン・有料プランに変えることもできます（変更後は特別招待プランに戻れません）。</p>
        </div>
      ) : (
        <SagaHero
          className="sm:rounded-3xl"
          eyebrow="FOR BUSINESS"
          title={
            <>
              事業主登録<span className="text-lg">（無料）</span>
            </>
          }
          lead="無料で 1 店舗を地図に掲載できます。クーポン・広告は登録後に有料プラン（月額 3,980 円）で使えます。"
        />
      )}
      <div className="relative -mt-4 px-4 sm:px-0">
      <form onSubmit={onSubmit} className="card space-y-4">
        <RegisterNotice business />
        <Field label="店舗名" name="name" required />
        <div>
          <label className="label" htmlFor="address">住所<Req /></label>
          <input
            id="address"
            name="address"
            ref={addressRef}
            required
            placeholder="佐賀県佐賀市駅前中央1丁目4-17"
            aria-invalid={Boolean(addressError)}
            onChange={() => setAddressError(null)}
            className={`input ${addressError ? "border-coupon ring-4 ring-coral-100" : ""}`}
          />
          {addressError ? (
            <p className="mt-1 text-sm font-bold text-coupon">{addressError}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">都道府県から番地まで入力すると、地図に自動でお店の場所が表示されます。</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="category">業種<Req /></label>
          <select id="category" name="category" required className="input">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="serviceDescription">サービス内容<Opt /></label>
          <textarea id="serviceDescription" name="serviceDescription" rows={3} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="priceLevel">価格帯<Opt /></label>
          <select id="priceLevel" name="priceLevel" defaultValue="2" className="input">
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Field label="連絡先（電話番号など）" name="contact" />
        <Field label="メールアドレス" name="email" type="email" required autoComplete="email" />
        <Field label="パスワード（8 文字以上）" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-slate-500">
          登録すると、<Link href="/terms" className="underline">利用規約</Link>と
          <Link href="/privacy" className="underline">プライバシーポリシー</Link>に同意したものとみなします。
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-accent btn-lg">
          {loading ? "登録中…" : inviteCode ? "特別招待プランで登録する" : "無料で登録する"}
        </button>
      </form>
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">
        登録済みの方は <Link className="text-saga-600 underline" href="/login?role=business">ログイン</Link>
      </p>
    </main>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {props.required ? <Req /> : <Opt />}
      </label>
      {props.type === "password" ? <PasswordInput id={name} name={name} {...props} /> : <input id={name} name={name} className="input" {...props} />}
    </div>
  );
}

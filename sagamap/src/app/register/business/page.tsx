"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CATEGORIES, PRICE_OPTIONS } from "@/lib/config";
import { api, ApiError } from "@/lib/fetcher";

export default function BusinessRegisterPage() {
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
    <main className="mx-auto max-w-lg p-4">
      <h1 className="mt-4 text-2xl font-bold">事業主登録（無料）</h1>
      <p className="mt-1 text-sm text-slate-600">
        無料プランで 1 店舗を地図に掲載できます。クーポン発行・広告出稿は登録後に有料プラン（月額 3,980 円）へ変更できます。
      </p>
      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <Field label="店舗名" name="name" required />
        <div>
          <label className="label" htmlFor="address">住所</label>
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
            <p className="mt-1 text-sm font-bold text-coupon">⚠️ {addressError}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">都道府県から番地まで入力すると、地図に自動でお店の場所が表示されます。</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="category">業種</label>
          <select id="category" name="category" required className="input">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="serviceDescription">サービス内容</label>
          <textarea id="serviceDescription" name="serviceDescription" rows={3} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="priceLevel">価格帯</label>
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
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "登録中…" : "無料で登録する"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        登録済みの方は <Link className="text-saga-600 underline" href="/login?role=business">ログイン</Link>
      </p>
    </main>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" {...props} />
    </div>
  );
}

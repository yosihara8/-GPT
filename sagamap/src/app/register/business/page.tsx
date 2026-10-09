"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/config";
import { api, ApiError } from "@/lib/fetcher";

export default function BusinessRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
          ...(f.lat && f.lng ? { lat: f.lat, lng: f.lng } : {}),
        }),
      });
      await signIn("credentials", { email: f.email, password: f.password, role: "business", redirect: false });
      router.push("/dashboard/business?welcome=1");
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof ApiError && err.data.needsLocation) setNeedsLocation(true);
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
        <Field label="住所" name="address" required placeholder="佐賀県佐賀市駅前中央1丁目…" />
        {needsLocation && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-amber-50 p-3">
            <p className="col-span-2 text-xs text-amber-800">
              住所から位置を特定できませんでした。Google マップで店舗を右クリックして表示される緯度・経度を入力してください。
            </p>
            <Field label="緯度" name="lat" required inputMode="decimal" placeholder="33.2643" />
            <Field label="経度" name="lng" required inputMode="decimal" placeholder="130.2970" />
          </div>
        )}
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
            <option value="1">¥（〜1,000 円）</option>
            <option value="2">¥¥（1,000〜3,000 円）</option>
            <option value="3">¥¥¥（3,000 円〜）</option>
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

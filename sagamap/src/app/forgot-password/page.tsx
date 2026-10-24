"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/fetcher";
import { useT } from "@/components/LangProvider";

export default function ForgotPasswordPage() {
  const t = useT();
  const [role, setRole] = useState<"customer" | "business">("customer");
  const [sent, setSent] = useState<{ mailEnabled: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const email = new FormData(e.currentTarget).get("email");
      setSent(await api<{ mailEnabled: boolean }>("/api/account/forgot", { method: "POST", body: JSON.stringify({ email, role }) }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mt-4 text-2xl font-bold">{t("パスワードの再設定")}</h1>
      {sent ? (
        <div className="card mt-4 space-y-2 text-sm">
          <p className="font-bold">{t("ご登録のメールアドレス宛てに、再設定用のリンクをお送りしました（1 時間有効）。")}</p>
          <p className="text-slate-600">{t("メールが届かない場合は、迷惑メールフォルダをご確認いただくか、運営者にお問い合わせください。")}</p>
          {!sent.mailEnabled && (
            <p className="rounded-xl bg-sun-100 px-3 py-2 text-amber-800">
              {t("現在メール送信の準備中です。お手数ですが、運営者にお問い合わせください。運営者から再設定用のリンクをお送りします。")}
            </p>
          )}
          <Link href="/login" className="btn-outline mt-2 w-full">
            {t("ログインへ戻る")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card mt-4 space-y-4">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm">
            {(["customer", "business"] as const).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className={`rounded-lg py-2 ${role === r ? "bg-saga-600 font-bold text-white" : "text-slate-500"}`}
              >
                {r === "customer" ? t("お客さま") : t("事業主")}
              </button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="email">{t("登録したメールアドレス")}</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn-primary btn-lg">
            {loading ? t("送信中…") : t("再設定用のリンクを送る")}
          </button>
        </form>
      )}
    </main>
  );
}

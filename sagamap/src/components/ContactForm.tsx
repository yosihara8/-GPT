"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/fetcher";
import { INQUIRY_CATEGORIES } from "@/lib/inquiry";
import { Req } from "@/components/FormMarks";
import { useT } from "@/components/LangProvider";

/** お問い合わせフォーム（お客さま・事業主・未登録の方で共通） */
export default function ContactForm({ role }: { role: "customer" | "business" }) {
  const t = useT();
  const { data } = useSession();
  const user = data?.user as { name?: string | null; email?: string | null } | undefined;
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [length, setLength] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<{ id: number }>("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          category: f.get("category"),
          body: f.get("body"),
          agree: f.get("agree") === "on",
          website: f.get("website") || undefined,
        }),
      });
      setSent(r.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <section className="card space-y-3 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-tea-600" aria-hidden />
        <h2 className="text-lg font-bold">{t("お問い合わせを受け付けました")}</h2>
        <p className="num text-2xl font-bold">{t("受付番号")} #{sent}</p>
        <p className="text-sm text-slate-600">
          {t("ご入力のメールアドレスに受付のメールをお送りしました。内容を確認のうえ、原則 3 営業日以内にご連絡します。")}
          <br />
          {t("メールが届かない場合は、迷惑メールのフォルダもご確認ください。")}
        </p>
        <Link href={role === "business" ? "/dashboard/business" : "/"} className="btn-primary btn-lg">
          {role === "business" ? t("事業主ホームに戻る") : t("地図に戻る")}
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <p className="text-xs text-slate-500">
        <Req />
        {t("の項目は必ず入力してください。")}
      </p>
      <div>
        <label className="label" htmlFor="c-name">
          {t("お名前")}{role === "business" && "（店舗名・担当者名）"}
          <Req />
        </label>
        <input id="c-name" name="name" required maxLength={60} defaultValue={user?.name ?? ""} key={user?.name ?? "n"} autoComplete="name" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="c-email">
          {t("メールアドレス（ご返信先）")}
          <Req />
        </label>
        <input id="c-email" name="email" type="email" required maxLength={254} defaultValue={user?.email ?? ""} key={user?.email ?? "e"} autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="c-category">
          {t("お問い合わせの種類")}
          <Req />
        </label>
        <select id="c-category" name="category" required defaultValue="" className="input">
          <option value="" disabled>
            {t("選んでください")}
          </option>
          {INQUIRY_CATEGORIES[role].map((c) => (
            <option key={c} value={c}>{t(c)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="c-body">
          {t("お問い合わせ内容")}
          <Req />
        </label>
        <textarea
          id="c-body"
          name="body"
          required
          minLength={5}
          maxLength={2000}
          rows={7}
          onChange={(e) => setLength(e.target.value.length)}
          placeholder={role === "business" ? t("例：クーポンの写真が表示されません。お店の名前：〇〇") : t("例：〇〇というお店のクーポンが使えませんでした。")}
          className="input"
        />
        <p className="mt-1 text-right text-xs text-slate-500">
          <span className="num">{length}</span> / 2000 {t("文字")}
        </p>
      </div>
      {/* いたずら防止（人には見えない欄） */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">{t("ホームページ")}</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-0.5 h-5 w-5 shrink-0 accent-saga-600" />
        <span>
          <Link href="/privacy" target="_blank" className="font-bold text-saga-700 underline">
            {t("プライバシーポリシー")}
          </Link>
          {t("に同意して送信します")}
          <Req />
        </span>
      </label>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
      <button disabled={loading} className="btn-accent btn-lg">
        {loading ? t("送信しています…") : t("送信する")}
      </button>
    </form>
  );
}

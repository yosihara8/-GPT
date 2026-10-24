"use client";

import PasswordInput from "@/components/PasswordInput";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useT } from "@/components/LangProvider";

/** メールアドレスの変更（今のパスワードで本人確認） */
export default function EmailChangeForm({ onChanged, admin = false }: { onChanged?: (email: string) => void; admin?: boolean }) {
  const t = useT();
  const endpoint = admin ? "/api/account/email?as=admin" : "/api/account/email";
  const [current, setCurrent] = useState<string | null>(null);
  const [canChange, setCanChange] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ email: string; canChange: boolean }>(endpoint)
      .then((d) => {
        setCurrent(d.email);
        setCanChange(d.canChange);
      })
      .catch(() => setCurrent(""));
  }, [endpoint]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (f.email.trim().toLowerCase() !== f.email2.trim().toLowerCase()) {
      return setMsg({ ok: false, text: t("確認用のメールアドレスが一致しません") });
    }
    setSaving(true);
    setMsg(null);
    try {
      const d = await api<{ email: string; verify: boolean }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email: f.email, password: f.password }),
      });
      setCurrent(d.email);
      setMsg({
        ok: true,
        text: d.verify
          ? t("メールアドレスを変更しました。新しいアドレスに確認メールを送りました。メールのボタンを押して確認を完了してください。")
          : t("メールアドレスを変更しました。次回から新しいアドレスでログインしてください。"),
      });
      form.reset();
      onChanged?.(d.email);
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-bold">{t("メールアドレスの変更")}</h2>
      <p className="text-sm text-slate-600">
        {t("今のメールアドレス：")}<b className="break-all text-slate-900">{current ?? t("読み込み中…")}</b>
      </p>
      {canChange ? (
        <>
          <input name="email" type="email" required placeholder={t("新しいメールアドレス")} autoComplete="email" className="input" />
          <input name="email2" type="email" required placeholder={t("新しいメールアドレス（確認）")} autoComplete="email" className="input" />
          <PasswordInput name="password" required placeholder={t("今のパスワード（本人確認のため）")} autoComplete="current-password" className="input" />
          <p className="text-xs text-slate-500">{t("変更すると、元のメールアドレスにもお知らせが届きます。ログインには新しいメールアドレスを使います。")}</p>
          {msg && <p className={`text-sm ${msg.ok ? "text-tea-700" : "text-red-600"}`}>{msg.text}</p>}
          <button disabled={saving} className="btn-primary w-full">
            {saving ? t("変更中…") : t("変更する")}
          </button>
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {t("Google で登録したアカウント、または代理ログイン中は、ここからメールアドレスを変更できません。")}
        </p>
      )}
    </form>
  );
}

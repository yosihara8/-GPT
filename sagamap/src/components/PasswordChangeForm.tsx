"use client";

import { useState } from "react";
import { api } from "@/lib/fetcher";

export default function PasswordChangeForm({ minLength = 8 }: { minLength?: number }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (f.next !== f.next2) return setMsg({ ok: false, text: "確認用のパスワードが一致しません" });
    try {
      await api("/api/account/password", { method: "POST", body: JSON.stringify({ current: f.current, next: f.next }) });
      setMsg({ ok: true, text: "パスワードを変更しました" });
      form.reset();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-bold">パスワードの変更</h2>
      <input name="current" type="password" required placeholder="現在のパスワード" autoComplete="current-password" className="input" />
      <input name="next" type="password" required minLength={minLength} placeholder={`新しいパスワード（${minLength} 文字以上）`} autoComplete="new-password" className="input" />
      <input name="next2" type="password" required minLength={minLength} placeholder="新しいパスワード（確認）" autoComplete="new-password" className="input" />
      {msg && <p className={`text-sm ${msg.ok ? "text-tea-700" : "text-red-600"}`}>{msg.text}</p>}
      <button className="btn-primary w-full">変更する</button>
    </form>
  );
}

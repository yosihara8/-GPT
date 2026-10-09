"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

/** メール未確認のときに表示する案内（メール送信が有効なときだけ） */
export default function VerifyEmailBanner() {
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api<{ emailVerified: boolean; mailEnabled: boolean }>("/api/account/status")
      .then((s) => setShow(s.mailEnabled && !s.emailVerified))
      .catch(() => setShow(false));
  }, []);
  if (!show) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-sun-100 px-4 py-3 text-sm font-bold text-amber-900">
      📧 メールアドレスの確認が済んでいません。届いたメールのリンクを開いてください。
      <button
        className="underline"
        onClick={() =>
          api("/api/account/resend-verification", { method: "POST" })
            .then(() => setMsg("確認メールを再送しました"))
            .catch((e: Error) => setMsg(e.message))
        }
      >
        再送する
      </button>
      {msg && <span className="font-normal">{msg}</span>}
    </div>
  );
}

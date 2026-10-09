"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BusinessRegisterForm from "@/components/BusinessRegisterForm";
import { api } from "@/lib/fetcher";

/** 特別招待の事業主登録ページ: /register/special?code=XXXX */
export default function SpecialRegisterPage() {
  return (
    <Suspense>
      <SpecialRegister />
    </Suspense>
  );
}

function SpecialRegister() {
  const code = (useSearchParams().get("code") ?? "").trim().toUpperCase();
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!code) return setValid(false);
    api<{ valid: boolean }>(`/api/invites/check?code=${encodeURIComponent(code)}`)
      .then((d) => setValid(d.valid))
      .catch(() => setValid(false));
  }, [code]);

  if (valid === null) return <main className="p-6 text-center text-sm text-slate-500">招待リンクを確認しています…</main>;
  if (!valid) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="text-5xl">🎟️</p>
        <h1 className="mt-4 text-xl font-extrabold">この招待リンクは使えません</h1>
        <p className="mt-2 text-sm text-slate-600">
          有効期限が切れたか、利用できる人数に達した可能性があります。お手数ですが、紹介してくれた運営者にお問い合わせください。
        </p>
        <Link href="/register/business" className="btn-outline mt-6">
          通常の事業主登録へ
        </Link>
      </main>
    );
  }
  return <BusinessRegisterForm inviteCode={code} />;
}

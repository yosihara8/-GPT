"use client";

import { CircleAlert } from "lucide-react";
import { useEffect } from "react";
import { reportError } from "@/components/ErrorReporter";

/** 画面の表示中にエラーが起きたときの案内 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error.message + (error.digest ? ` (digest: ${error.digest})` : ""), error.stack);
  }, [error]);
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500" aria-hidden><CircleAlert className="h-7 w-7" /></span>
      <h1 className="mt-4 text-xl font-bold">うまく表示できませんでした</h1>
      <p className="mt-2 text-sm text-slate-600">お手数ですが、もう一度お試しください。問題は運営者に自動で報告されました。</p>
      <button onClick={reset} className="btn-primary mt-6">
        もう一度読み込む
      </button>
    </main>
  );
}

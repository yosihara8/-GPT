"use client";

import { useEffect } from "react";

/** 画面で起きたエラーをサーバーに記録する（運営者が管理画面の「エラー」で確認できる） */
export function reportError(message: string, stack?: string) {
  try {
    const body = JSON.stringify({ message: message.slice(0, 1000), stack: stack?.slice(0, 4000), url: location.href });
    if (!navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }))) {
      fetch("/api/errors", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    /* 記録に失敗しても画面には影響させない */
  }
}

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.message, e.error?.stack);
    const onRejection = (e: PromiseRejectionEvent) =>
      reportError(String(e.reason?.message ?? e.reason), e.reason?.stack);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

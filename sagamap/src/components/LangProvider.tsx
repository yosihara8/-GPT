"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LANG_COOKIE, fill, translate, type Lang } from "@/lib/i18n";

const JA_ONLY = ["/dashboard/business", "/admin", "/register/business", "/register/special", "/upgrade", "/terms", "/privacy", "/tokushoho"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (s: string, vars?: Record<string, string | number>) => string };
const LangContext = createContext<Ctx>({ lang: "ja", setLang: () => {}, t: (s, v) => fill(s, v) });

/** 日本語・英語の切り替え（Cookie に覚えて、サーバーの画面も作り直す） */
export function LangProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback(
    (l: Lang) => {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
      setLangState(l);
      router.refresh();
    },
    [router],
  );
  // 事業主・管理者の画面は日本語のみ（英語に切り替えていても日本語で出す）
  const path = usePathname() ?? "";
  const jaOnly = JA_ONLY.some((p) => path === p || path.startsWith(`${p}/`));
  const shown: Lang = jaOnly ? "ja" : lang;
  const value = useMemo<Ctx>(() => ({ lang: shown, setLang, t: (s, vars) => fill(translate(shown, s), vars) }), [shown, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;

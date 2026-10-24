"use client";

import { SessionProvider } from "next-auth/react";
import { LangProvider } from "./LangProvider";
import type { Lang } from "@/lib/i18n";

export default function Providers({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LangProvider initial={lang}>{children}</LangProvider>
    </SessionProvider>
  );
}

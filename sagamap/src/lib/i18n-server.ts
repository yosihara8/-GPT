import { cookies } from "next/headers";
import { LANG_COOKIE, fill, translate, type Lang } from "./i18n";

/** サーバーで表示する画面の言語（Cookie で切り替え） */
export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "ja";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: (s: string, vars?: Record<string, string | number>) => fill(translate(lang, s), vars) };
}

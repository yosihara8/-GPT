import { EN, WEEKDAY_EN } from "./i18n-en";

/**
 * 日本語・英語の切り替え（お客さま向けの画面だけ）。
 * 文言は日本語をそのまま鍵にして、英語の辞書（i18n-en.ts）を引く。辞書に無いもの（お店が入力した名前・紹介文など）は日本語のまま。
 * 数字の入った文（「徒歩 5 分」「500円引き」など）は RULES で置き換える。
 */
export type Lang = "ja" | "en";
export const LANG_COOKIE = "sagamap-lang";

const RULES: [RegExp, string | ((...m: string[]) => string)][] = [
  [/^(\d[\d.,]*\s*k?m)・徒歩\s*(\d+)\s*分$/, (_, d, n) => `${d} · ${n} min walk`],
  [/^(\d[\d.,]*\s*k?m)・車で\s*(\d+)\s*分$/, (_, d, n) => `${d} · ${n} min drive`],
  [/^徒歩\s*(\d+)\s*分$/, (_, n) => `${n} min walk`],
  [/^車で\s*(\d+)\s*分$/, (_, n) => `${n} min drive`],
  [/^現在地から\s*(.+)$/, (_, r) => `${translate("en", r)} from you`],
  [/^営業中（(\d{1,2}:\d{2})まで）$/, (_, t) => `Open until ${t}`],
  [/^営業時間外（(\d{1,2}:\d{2})から）$/, (_, t) => `Closed · opens ${t}`],
  [/^まもなく閉店（(\d{1,2}:\d{2})まで）$/, (_, t) => `Closing soon (until ${t})`],
  [/^先着(\d+)名・残り(\d+)名$/, (_, a, b) => `First ${a} people · ${b} left`],
  [/^(\d+)分前$/, (_, n) => `${n} min ago`],
  [/^(\d+)時間前$/, (_, n) => `${n} h ago`],
  [/^(\d+)日前$/, (_, n) => `${n} days ago`],
  [/^(\d[\d,]*)円引$/, (_, n) => `¥${n} off`],
  // 曜日と時刻だけの文（「月〜金 11:00〜20:00、土・日 …」「水曜・木曜」）
  [/^[日月火水木金土曜〜・、\s\d:\/～]+$/, (s) => s.replace(/([日月火水木金土])曜?/g, (_, d) => WEEKDAY_EN[d]).replace(/[〜～]/g, "–").replace(/・/g, ", ").replace(/、/g, "; ")],
  [/^(\d+)\/(\d+)まで$/, (_, m, d) => `Until ${m}/${d}`],
  [/^残り(\d+)名$/, (_, n) => `${n} left`],
  [/^あと(\d+)日$/, (_, n) => `${n} days left`],
  [/^(\d[\d,]*)円引き?$/, (_, n) => `¥${n} off`],
  [/^(\d+)%OFF$/, (_, n) => `${n}% off`],
  [/^(\d[\d,]*)円$/, (_, n) => `¥${n}`],
  [/^よく見ている「(.+)」$/, (_, c) => `You often view: ${translate("en", c)}`],
  [/^「(.+)」のお店$/, (_, q) => `Results for “${q}”`],
  [/^(.+)エリア$/, (_, a) => `${translate("en", a)} Area`],
];

export function translate(lang: Lang, s: string): string {
  if (lang === "ja" || !s) return s;
  const hit = EN[s];
  if (hit !== undefined) return hit;
  for (const [re, to] of RULES) {
    const m = s.match(re);
    if (m) return typeof to === "string" ? to : to(...m);
  }
  return s;
}

/** 文の中の {名前} を値に置き換える（例：t("{n} 件", { n: 3 })） */
export function fill(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s;
}

/**
 * 佐賀県の 5 つのエリア（市町の住所から決める）。
 * 一覧・お店のページの小さな色札に使う（色は佐賀観光マップ独自）。
 */
export type Area = { key: string; name: string; cls: string };

const AREAS: { area: Area; towns: string[] }[] = [
  { area: { key: "nw", name: "北西部", cls: "bg-[#3C93B8] text-white" }, towns: ["唐津市", "玄海町"] },
  { area: { key: "w", name: "西部", cls: "bg-[#2F4E86] text-white" }, towns: ["伊万里市", "有田町"] },
  { area: { key: "c", name: "中部", cls: "bg-[#8A5FA6] text-white" }, towns: ["佐賀市", "小城市", "多久市"] },
  { area: { key: "e", name: "東部", cls: "bg-[#4F9446] text-white" }, towns: ["神埼市", "吉野ヶ里町", "鳥栖市", "基山町", "みやき町", "上峰町"] },
  { area: { key: "s", name: "南部", cls: "bg-[#D0682F] text-white" }, towns: ["武雄市", "嬉野市", "鹿島市", "太良町", "白石町", "江北町", "大町町"] },
];

/** 住所 → エリアと市町（見つからなければ null） */
export function areaOf(address?: string | null): { area: Area; town: string } | null {
  if (!address) return null;
  for (const { area, towns } of AREAS) {
    const town = towns.find((t) => address.includes(t));
    if (town) return { area, town };
  }
  return null;
}

/** エリアの一覧（エリアからさがす用） */
export const AREA_LIST: (Area & { towns: string[]; border: string })[] = AREAS.map(({ area, towns }) => ({
  ...area,
  towns,
  border: area.cls.match(/bg-\[(#[0-9A-Fa-f]+)\]/)?.[1] ?? "#1E3A6E",
}));

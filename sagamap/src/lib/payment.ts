import { PAYMENT_GROUPS } from "./config";

/** 支払い方法の短い札（地図の絞り込み・お店の特徴に使う） */
export const PAYMENT_TAGS: Record<string, string> = {
  card: "カード払いOK",
  barcode: "バーコード決済OK",
  transit: "交通系IC OK",
  emoney: "電子マネーOK",
};

export function paymentTags(shop: { payment_methods?: string[] | null; amenities?: string[] | null }) {
  const ms = shop.payment_methods ?? [];
  const tags = PAYMENT_GROUPS.filter((g) => (g.items as readonly string[]).some((i) => ms.includes(i))).map((g) => PAYMENT_TAGS[g.key]);
  // 以前の「お店の特徴」で選ばれていたもの
  if (shop.amenities?.includes("カード払いOK") && !tags.includes(PAYMENT_TAGS.card)) tags.push(PAYMENT_TAGS.card);
  if (shop.amenities?.includes("電子マネー・QR決済") && !tags.includes(PAYMENT_TAGS.barcode)) tags.push(PAYMENT_TAGS.barcode);
  return tags;
}

/** お店のページの「お支払い方法」：種類ごとに使えるもの／使えない */
export function paymentRows(methods?: string[] | null, none?: string[] | null) {
  const ms = methods ?? [];
  return PAYMENT_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    items: (g.items as readonly string[]).filter((i) => ms.includes(i)),
    none: (none ?? []).includes(g.key),
  })).filter((r) => r.items.length > 0 || r.none);
}

/**
 * クーポンの種類と表示の文字（お客さま・事業主・メールで共通）
 *  percent … ○%OFF / yen … ○円引き / price … 特別価格 ○円 / gift … 特典（トッピング無料・1 ドリンクサービスなど）
 */
export const COUPON_TYPES = ["percent", "yen", "price", "gift"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_TYPE_LABELS: Record<CouponType, { name: string; example: string }> = {
  percent: { name: "％引き", example: "例：ランチ 10%OFF" },
  yen: { name: "円引き", example: "例：お会計から 500円引き" },
  price: { name: "特別価格", example: "例：限定ランチ 980円" },
  gift: { name: "特典・サービス", example: "例：トッピング 1 品無料・1 ドリンクサービス" },
};

export type CouponValue = {
  coupon_type?: CouponType | string | null;
  discount_rate?: number | null;
  amount_yen?: number | null;
  special_price?: number | null;
  regular_price?: number | null;
  benefit?: string | null;
};

const yen = (n: number) => n.toLocaleString("ja-JP");

/** 大きく見せる部分（main）と小さく添える部分（sub）。チケットの左側に使う */
export function couponBadge(c: CouponValue): { main: string; sub: string; tone: "red" | "gold" | "green" } {
  switch (c.coupon_type) {
    case "yen":
      return { main: yen(c.amount_yen ?? 0), sub: "円引き", tone: "red" };
    case "price":
      return { main: yen(c.special_price ?? 0), sub: "円", tone: "gold" };
    case "gift":
      return { main: "特典", sub: "サービス", tone: "green" };
    default:
      return { main: String(c.discount_rate ?? 0), sub: "%OFF", tone: "red" };
  }
}

/** 1 行で言うと（例「30%OFF」「500円引き」「特別価格 980円」「特典：トッピング無料」） */
export function couponHeadline(c: CouponValue) {
  switch (c.coupon_type) {
    case "yen":
      return `${yen(c.amount_yen ?? 0)}円引き`;
    case "price":
      return `特別価格 ${yen(c.special_price ?? 0)}円${c.regular_price ? `（通常 ${yen(c.regular_price)}円）` : ""}`;
    case "gift":
      return c.benefit ? `特典：${c.benefit}` : "特典サービス";
    default:
      return `${c.discount_rate ?? 0}%OFF`;
  }
}

/** 地図の札など、とても短く（例「30%OFF」「500円引」「980円」「特典」） */
export function couponShort(c: CouponValue) {
  switch (c.coupon_type) {
    case "yen":
      return `${yen(c.amount_yen ?? 0)}円引`;
    case "price":
      return `${yen(c.special_price ?? 0)}円`;
    case "gift":
      return "特典あり";
    default:
      return `${c.discount_rate ?? 0}%OFF`;
  }
}

/** SQL：クーポン 1 件の短い表示（c はクーポンの別名） */
export const COUPON_SHORT_SQL = (c = "c") => `CASE ${c}.coupon_type
    WHEN 'yen' THEN to_char(${c}.amount_yen, 'FM999,999,999') || '円引'
    WHEN 'price' THEN to_char(${c}.special_price, 'FM999,999,999') || '円'
    WHEN 'gift' THEN '特典あり'
    ELSE ${c}.discount_rate || '%OFF' END`;

/** SQL：クーポン 1 件の 1 行表示 */
export const COUPON_HEADLINE_SQL = (c = "c") => `CASE ${c}.coupon_type
    WHEN 'yen' THEN to_char(${c}.amount_yen, 'FM999,999,999') || '円引き'
    WHEN 'price' THEN '特別価格 ' || to_char(${c}.special_price, 'FM999,999,999') || '円'
    WHEN 'gift' THEN '特典：' || ${c}.benefit
    ELSE ${c}.discount_rate || '%OFF' END`;

/** SQL：お店でいちばん目を引くクーポンの短い表示（地図の札・カード用。b はお店の別名） */
export const BEST_LABEL_SQL = (b = "b") => `(SELECT ${COUPON_SHORT_SQL("cx")} FROM coupons cx
    WHERE cx.business_id = ${b}.id AND cx.is_active AND cx.expires_at > now()
    ORDER BY (cx.coupon_type = 'percent') DESC, cx.discount_rate DESC NULLS LAST, cx.amount_yen DESC NULLS LAST, cx.created_at DESC LIMIT 1)`;

/** お客さまに見せるクーポンの列（c はクーポンの別名） */
export const COUPON_PUBLIC_COLUMNS = (c = "c") =>
  `${c}.id, ${c}.title, ${c}.discount_rate, ${c}.conditions, ${c}.expires_at, (${c}.image IS NOT NULL) AS has_image,
   ${c}.coupon_type, ${c}.amount_yen, ${c}.special_price, ${c}.regular_price, ${c}.benefit, ${c}.max_uses, ${c}.repeatable, ${c}.first_visit_only,
   (SELECT count(*) FROM usage_history uh WHERE uh.coupon_id = ${c}.id AND uh.coupon_used)::int AS used_count,
   (SELECT ev.title FROM events ev WHERE ev.id = ${c}.event_id) AS event_title,
   (SELECT ev.slug FROM events ev WHERE ev.id = ${c}.event_id) AS event_slug`;

/** 先着の残り（先着の設定がなければ null） */
export function remainingUses(c: { max_uses?: number | null; used_count?: number | null }) {
  if (!c.max_uses) return null;
  return Math.max(0, c.max_uses - (c.used_count ?? 0));
}

/** お客さまに見せる「使い方の条件」の短い説明 */
export function couponRules(c: { repeatable?: boolean | null; first_visit_only?: boolean | null; max_uses?: number | null; used_count?: number | null }) {
  const rules: string[] = [];
  if (c.first_visit_only) rules.push("初めての方限定");
  rules.push(c.repeatable ? "何度でも使える（1日1回）" : "1人1回");
  const left = remainingUses(c);
  if (left != null) rules.push(left > 0 ? `先着${c.max_uses}名・残り${left}名` : "先着の人数に達しました");
  return rules;
}

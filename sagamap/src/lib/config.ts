export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const PRICE_STANDARD = 3980;
export const PRICE_DISCOUNT = 2980;
export const REFERRAL_GOAL = 10;

/** 徒歩速度（m/分）。不動産表示の基準 80m/分 に合わせる */
export const WALK_METERS_PER_MIN = 80;
export const COUPON_HIGHLIGHT_RADIUS_M = 500;
export const WALK_10MIN_RADIUS_M = WALK_METERS_PER_MIN * 10;

/** 佐賀駅 */
export const SAGA_CENTER = { lat: 33.2643, lng: 130.297 };

export const CATEGORIES = [
  "飲食",
  "カフェ",
  "スイーツ",
  "バー",
  "雑貨",
  "アート・工芸",
  "宿泊",
  "体験・アクティビティ",
  "美容・健康",
  "その他",
] as const;

export const PRICE_LEVEL_LABELS: Record<number, string> = { 1: "¥", 2: "¥¥", 3: "¥¥¥" };

export function referralUrl(businessId: number) {
  return `${APP_URL}/ref?biz_id=${businessId}`;
}

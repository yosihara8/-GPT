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

/**
 * DB 接続文字列。Vercel の Neon 連携は接続時の接頭辞（STORAGE など）によって
 * 変数名が変わるため、よく使われる名前を順に探す。
 */
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_URL ||
  process.env.STORAGE_DATABASE_URL ||
  process.env.STORAGE_POSTGRES_URL;

/**
 * セッション署名用の秘密値。NEXTAUTH_SECRET が未設定なら、
 * 外部に公開されない DATABASE_URL（Vercel + Neon で自動設定）を代わりに使う。
 */
export const AUTH_SECRET = process.env.NEXTAUTH_SECRET || DATABASE_URL;

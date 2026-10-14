export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const PRICE_STANDARD = 3980;
export const PRICE_DISCOUNT = 2980;
export const REFERRAL_GOAL = 10;
/** 広告出稿の上限（1 か月あたり。毎月 1 日〜末日） */
export const ADS_PER_MONTH = 2;

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

/** 業種ごとのアイコン（地図のピン・カードに表示） */
export const CATEGORY_EMOJI: Record<string, string> = {
  飲食: "🍜",
  カフェ: "☕",
  スイーツ: "🍡",
  バー: "🍺",
  雑貨: "🎁",
  "アート・工芸": "🏺",
  宿泊: "🏨",
  "体験・アクティビティ": "🚲",
  "美容・健康": "💆",
  その他: "📍",
};
export const categoryEmoji = (c: string) => CATEGORY_EMOJI[c] ?? "📍";

const DISCLOSE_ON_REQUEST = "請求があった場合には、遅滞なく電子メールにて開示いたします";

/**
 * 運営者の所在地（環境変数 OPERATOR_ADDRESS。バーチャルオフィスの住所でも可）。
 * 広告を含むメール（特定電子メール法）では「請求があれば開示」の省略が使えないため、
 * メール末尾と特定商取引法に基づく表記にこの住所を表示する。
 */
export const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS?.trim() || null;

/**
 * 運営者情報（利用規約・特定商取引法に基づく表記・プライバシーポリシーで使用）。
 * 氏名・運営統括責任者・住所・電話番号は、オーナーの判断で「請求があれば遅滞なく開示」とする（特定商取引法 第 11 条ただし書）。
 * ご請求があったら、お問い合わせフォームかメールで受け付け、遅滞なく電子メールで開示する。
 * ※ メール末尾の住所（特定電子メール法）は省略できないため、OPERATOR_ADDRESS を使う（mail.ts）。
 */
export const OPERATOR = {
  serviceName: "佐賀観光マップ",
  name: "JapanAI研修",
  representative: DISCLOSE_ON_REQUEST,
  address: DISCLOSE_ON_REQUEST,
  phone: DISCLOSE_ON_REQUEST,
  email: "ai.prompt.biz@gmail.com",
};

/** 価格帯（1 人あたりの目安） */
export const PRICE_LEVEL_LABELS: Record<number, string> = { 1: "¥〜1,000", 2: "¥1,000〜3,000", 3: "¥3,000〜" };
export const PRICE_OPTIONS = [
  { value: "1", label: "¥〜1,000（1 人あたり）" },
  { value: "2", label: "¥1,000〜3,000（1 人あたり）" },
  { value: "3", label: "¥3,000〜（1 人あたり）" },
];

/** レジ横 QR ポスターのリンク（読み取り回数を数え、登録後はそのお店のページを開く） */
export function posterUrl(businessId: number) {
  return `${APP_URL}/p/${businessId}`;
}

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

/** お店の特徴（事業主が選ぶ。お客さまのお店のページと絞り込みに使う） */
export const AMENITIES = [
  "駐車場あり",
  "テイクアウト",
  "予約できる",
  "子ども連れ歓迎",
  "ペットOK",
  "Wi-Fiあり",
  "英語メニュー・英語対応",
  "全席禁煙",
  "個室あり",
  "車いすで入れる",
  "1人でも入りやすい",
  "団体・グループOK",
] as const;

/** お支払い方法（事業主が選ぶ。種類ごとに「使えない」も選べる） */
export const PAYMENT_GROUPS = [
  { key: "card", label: "クレジットカード", items: ["VISA", "Mastercard", "JCB", "American Express", "Diners Club"] },
  { key: "barcode", label: "バーコード決済", items: ["PayPay", "d払い", "楽天ペイ", "au PAY", "メルペイ", "ゆうちょPay", "Alipay+", "WeChat Pay"] },
  {
    key: "transit",
    label: "交通系IC",
    items: ["nimoca", "SUGOCA", "はやかけん", "Suica", "PASMO", "ICOCA", "manaca", "TOICA", "Kitaca", "PiTaPa"],
  },
  { key: "emoney", label: "電子マネー", items: ["iD", "QUICPay", "楽天Edy", "WAON", "nanaco"] },
] as const;
export type PaymentGroupKey = (typeof PAYMENT_GROUPS)[number]["key"];
export const PAYMENT_ITEMS = PAYMENT_GROUPS.flatMap((g) => g.items as readonly string[]) as [string, ...string[]];
export const PAYMENT_KEYS = PAYMENT_GROUPS.map((g) => g.key) as [PaymentGroupKey, ...PaymentGroupKey[]];

/** お店の写真の種類 */
export const PHOTO_KINDS = ["外観", "店内", "客席", "料理・商品", "雑貨・グッズ", "メニュー表", "スタッフ", "その他"] as const;
/** 写真の枚数（無料プラン / 有料プラン） */
export const PHOTO_LIMIT = { free: 3, premium: 20 } as const;

/** お問い合わせの種類（お客さま・事業主で出し分ける） */
export const INQUIRY_CATEGORIES = {
  customer: ["使い方について", "クーポンについて", "お店の情報の誤り", "ログイン・アカウント", "退会したい", "個人情報の開示・訂正・削除の請求", "不具合の報告", "その他"],
  business: ["使い方について", "お店の掲載・お店の情報", "クーポン・広告", "プラン・お支払い・解約", "ログイン・アカウント", "退会したい", "個人情報の開示・訂正・削除の請求", "不具合の報告", "その他"],
} as const;

export const ALL_INQUIRY_CATEGORIES = Array.from(new Set([...INQUIRY_CATEGORIES.customer, ...INQUIRY_CATEGORIES.business]));

export const INQUIRY_STATUS = { new: "未対応", in_progress: "対応中", done: "対応済み" } as const;
export type InquiryStatus = keyof typeof INQUIRY_STATUS;

export const INQUIRY_ROLE = { customer: "お客さま", business: "事業主", guest: "未登録の方" } as const;

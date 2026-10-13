import { PHOTO_LIMIT } from "./config";

/** お店のページの充実度に使う店舗の情報 */
export type ProfileStore = {
  has_photo: boolean;
  gallery_count?: number;
  menu_count?: number;
  active_coupons?: number;
  service_description: string;
  contact: string;
  weekly_hours?: unknown;
  amenities?: string[];
  payment_methods?: string[];
  payment_none?: string[];
  reservation_url?: string | null;
  line_url?: string | null;
  instagram_url?: string | null;
};

export type ProfileItem = { label: string; hint: string; done: boolean; href: string };

/** お店のページに足りない情報（ダッシュボードの充実度と月次レポートで共通） */
export function profileChecklist(store: ProfileStore, premium: boolean): ProfileItem[] {
  const photoGoal = Math.min(5, premium ? PHOTO_LIMIT.premium : PHOTO_LIMIT.free);
  const items: ProfileItem[] = [
    { label: "メイン写真", hint: "一覧と地図で最初に目に入る 1 枚", done: store.has_photo, href: "/dashboard/business/store#sec-main-photo" },
    {
      label: `お店の写真 ${photoGoal} 枚以上（いま ${store.gallery_count ?? 0} 枚）`,
      hint: "外観・店内・客席・商品。写真が多いお店ほど選ばれます",
      done: (store.gallery_count ?? 0) >= photoGoal,
      href: "/dashboard/business/store#sec-photos",
    },
    { label: "お店の紹介文（50 文字以上）", hint: "こだわり・おすすめ・雰囲気", done: (store.service_description ?? "").length >= 50, href: "/dashboard/business/store#sec-store" },
    { label: "電話番号", hint: "タップで電話できるようになります", done: Boolean(store.contact), href: "/dashboard/business/store#sec-store" },
    { label: "営業カレンダー", hint: "「営業中」の表示・臨時休業のお知らせ", done: Boolean(store.weekly_hours), href: "/dashboard/business/store#sec-schedule" },
    {
      label: "お支払い方法",
      hint: "PayPay・交通系IC などが使えるか",
      done: (store.payment_methods?.length ?? 0) > 0 || (store.payment_none?.length ?? 0) > 0,
      href: "/dashboard/business/store#sec-store",
    },
    { label: "お店の特徴", hint: "駐車場・テイクアウト・子ども連れ歓迎など", done: (store.amenities?.length ?? 0) > 0, href: "/dashboard/business/store#sec-store" },
    { label: "メニュー・商品 3 品以上", hint: "写真と価格つきで", done: (store.menu_count ?? 0) >= 3, href: "/dashboard/business/store#sec-menu" },
    {
      label: "配信中のクーポン",
      hint: premium ? "来店のいちばんのきっかけになります" : "有料プランで配信できます",
      done: (store.active_coupons ?? 0) > 0,
      href: premium ? "/dashboard/business/coupons" : "/dashboard/business/settings#plan",
    },
  ];
  if (premium) {
    items.push({
      label: "予約・LINE・SNS のリンク",
      hint: "お客さまがその場で予約・友だち追加",
      done: Boolean(store.reservation_url || store.line_url || store.instagram_url),
      href: "/dashboard/business/store#sec-store",
    });
  }
  return items;
}

export const profilePercent = (items: ProfileItem[]) => Math.round((items.filter((i) => i.done).length / items.length) * 100);

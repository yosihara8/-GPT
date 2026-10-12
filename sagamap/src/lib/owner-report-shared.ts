/** 月次レポートの型と表示用の関数（画面とサーバーで共通） */
/** 1 か月の数字（お客さまの行動） */
export type Metrics = {
  views: number;
  viewers: number;
  route: number;
  call: number;
  save: number;
  share: number;
  coupon_view: number;
  coupon_uses: number;
  qr_scan: number;
  favorites: number;
  ad_views: number;
  ad_clicks: number;
};
export const METRIC_LABELS: [keyof Metrics, string][] = [
  ["views", "お店のページを見た回数"],
  ["viewers", "見た人の数"],
  ["route", "経路を調べた"],
  ["call", "電話・予約・LINE"],
  ["save", "お気に入りに保存"],
  ["coupon_view", "クーポンを見た"],
  ["coupon_uses", "クーポンが使われた"],
  ["qr_scan", "QR ポスターから来た"],
  ["ad_clicks", "広告がタップされた"],
];

export type StoreReport = { id: number; name: string; cur: Metrics; prev: Metrics; profile: number; todo: string[]; advice: string[] };
export type OwnerReport = { ownerId: number; name: string; email: string; premium: boolean; month: string; label: string; stores: StoreReport[] };

export const prevMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
export const monthLabel = (month: string) => `${Number(month.slice(0, 4))}年${Number(month.slice(5, 7))}月`;
/** 日本時間の今月 'YYYY-MM' */
export const thisMonth = (now = new Date()) => new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 7);


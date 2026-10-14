import { gzipSync } from "node:zlib";
import { query } from "./db";

/**
 * バックアップの対象（JSON）。
 * 安全のためパスワードのハッシュ・写真データ・ログイン用トークンは含めない。
 */
const TABLES: Record<string, string> = {
  business_owners:
    "SELECT id, name, email, plan, monthly_price, complimentary, invite_code_id, stripe_customer_id, stripe_subscription_id, email_verified_at, created_at FROM business_owners ORDER BY id",
  businesses:
    "SELECT id, owner_id, name, address, lat, lng, category, service_description, contact, price_level, crowd_level, is_premium, instagram_url, twitter_url, threads_url, facebook_url, youtube_url, tiktok_url, business_hours, closed_days, weekly_hours, hours_note, amenities, payment_methods, payment_none, website_url, reservation_url, line_url, view_count, created_at FROM businesses ORDER BY id",
  customers: "SELECT id, name, email, interests, notify_enabled, email_verified_at, created_at FROM customers ORDER BY id",
  coupons: "SELECT id, business_id, event_id, title, coupon_type, discount_rate, amount_yen, special_price, regular_price, benefit, max_uses, repeatable, first_visit_only, conditions, expires_at, is_active, created_at, review_flags, reviewed_at, deleted_at, (image IS NOT NULL) AS has_image FROM coupons ORDER BY id",
  referrals: "SELECT * FROM referrals ORDER BY id",
  referral_monthly_results: "SELECT * FROM referral_monthly_results",
  usage_history: "SELECT * FROM usage_history ORDER BY id",
  ads: "SELECT id, business_id, headline, body, starts_at, ends_at, is_active, created_at, review_flags, reviewed_at, (image IS NOT NULL) AS has_image FROM ads ORDER BY id",
  notifications: "SELECT * FROM notifications ORDER BY id",
  favorites: "SELECT * FROM favorites",
  menu_items: "SELECT id, business_id, name, price, description, sort, created_at, (image IS NOT NULL) AS has_image FROM menu_items ORDER BY id",
  shop_events: "SELECT * FROM shop_events ORDER BY id",
  business_photos: "SELECT id, business_id, kind, caption, sort, created_at FROM business_photos ORDER BY id",
  events: "SELECT * FROM events ORDER BY id",
  business_days: "SELECT * FROM business_days ORDER BY business_id, day",
  invite_codes: "SELECT * FROM invite_codes ORDER BY id",
  tourist_spots: "SELECT * FROM tourist_spots ORDER BY id",
  admin_audit_logs: "SELECT * FROM admin_audit_logs ORDER BY id",
};

export async function exportBackup() {
  const data: Record<string, unknown[]> = {};
  for (const [name, sql] of Object.entries(TABLES)) data[name] = await query(sql);
  return { exportedAt: new Date().toISOString(), data };
}

export const backupFilename = (d = new Date()) =>
  `sagamap-backup-${new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;

/** メール添付用（gzip 圧縮） */
export async function backupAttachment() {
  const backup = await exportBackup();
  const json = JSON.stringify(backup);
  const counts = Object.fromEntries(Object.entries(backup.data).map(([k, v]) => [k, v.length]));
  return { filename: `${backupFilename()}.gz`, content: gzipSync(json), counts, bytes: json.length };
}

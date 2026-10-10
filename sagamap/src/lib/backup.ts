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
    "SELECT id, owner_id, name, address, lat, lng, category, service_description, contact, price_level, crowd_level, is_premium, instagram_url, twitter_url, view_count, created_at FROM businesses ORDER BY id",
  customers: "SELECT id, name, email, interests, notify_enabled, email_verified_at, created_at FROM customers ORDER BY id",
  coupons: "SELECT * FROM coupons ORDER BY id",
  referrals: "SELECT * FROM referrals ORDER BY id",
  referral_monthly_results: "SELECT * FROM referral_monthly_results",
  usage_history: "SELECT * FROM usage_history ORDER BY id",
  ads: "SELECT * FROM ads ORDER BY id",
  notifications: "SELECT * FROM notifications ORDER BY id",
  favorites: "SELECT * FROM favorites",
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

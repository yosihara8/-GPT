import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 全データのバックアップ（JSON）。
 * 安全のためパスワードのハッシュ・写真データ・ログイン用トークンは含めない。
 */
const TABLES: Record<string, string> = {
  business_owners: "SELECT id, name, email, plan, monthly_price, stripe_customer_id, stripe_subscription_id, email_verified_at, created_at FROM business_owners ORDER BY id",
  businesses: "SELECT id, owner_id, name, address, lat, lng, category, service_description, contact, price_level, crowd_level, is_premium, instagram_url, twitter_url, view_count, created_at FROM businesses ORDER BY id",
  customers: "SELECT id, name, email, interests, notify_enabled, email_verified_at, created_at FROM customers ORDER BY id",
  coupons: "SELECT * FROM coupons ORDER BY id",
  referrals: "SELECT * FROM referrals ORDER BY id",
  usage_history: "SELECT * FROM usage_history ORDER BY id",
  ads: "SELECT * FROM ads ORDER BY id",
  notifications: "SELECT * FROM notifications ORDER BY id",
  tourist_spots: "SELECT * FROM tourist_spots ORDER BY id",
  admin_audit_logs: "SELECT * FROM admin_audit_logs ORDER BY id",
};

export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const data: Record<string, unknown[]> = {};
  for (const [name, sql] of Object.entries(TABLES)) data[name] = await query(sql);
  await auditLog(auth.user.id, "バックアップを書き出し", "all");
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sagamap-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

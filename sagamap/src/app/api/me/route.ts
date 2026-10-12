import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { SPECIAL_DAYS_SQL } from "@/lib/schedule";

export const dynamic = "force-dynamic";

/** ログイン中の事業主のアカウント情報と所有店舗 */
export async function GET() {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const owner = await queryOne(
    "SELECT id, name, email, plan, monthly_price, complimentary, plan_ends_at, created_at FROM business_owners WHERE id = $1",
    [auth.user.id],
  );
  const stores = await query(
    `SELECT id, name, address, lat, lng, category, service_description, contact, price_level, crowd_level,
            instagram_url, twitter_url, threads_url, facebook_url, business_hours, closed_days, amenities,
            weekly_hours, hours_note, ${SPECIAL_DAYS_SQL("b", -1, 400)} AS special_days, website_url, reservation_url, line_url,
            photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM photo_updated_at)::bigint AS photo_version
       FROM businesses b WHERE owner_id = $1 ORDER BY id`,
    [auth.user.id],
  );
  return NextResponse.json({ owner, stores });
}

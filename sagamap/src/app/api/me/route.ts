import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** ログイン中の事業主のアカウント情報と所有店舗 */
export async function GET() {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const owner = await queryOne(
    "SELECT id, name, email, plan, monthly_price, created_at FROM business_owners WHERE id = $1",
    [auth.user.id],
  );
  const stores = await query(
    `SELECT id, name, address, lat, lng, category, service_description, contact, price_level, crowd_level,
            instagram_url, twitter_url,
            photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM photo_updated_at)::bigint AS photo_version
       FROM businesses WHERE owner_id = $1 ORDER BY id`,
    [auth.user.id],
  );
  return NextResponse.json({ owner, stores });
}

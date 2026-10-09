import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { storeCreateSchema } from "@/lib/schemas";
import { ADDRESS_NOT_FOUND, geocodeAddress } from "@/lib/geocode";
import { getOwnerPlan, requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 店舗一覧（地図表示用・会員登録なしで閲覧可） */
export async function GET() {
  const rows = await query(
    `SELECT b.id, b.name, b.address, b.lat, b.lng, b.category, b.service_description, b.price_level, b.is_premium,
            b.photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM b.photo_updated_at)::bigint AS photo_version,
            EXISTS (SELECT 1 FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now()) AS has_coupon
       FROM businesses b ORDER BY b.id`,
  );
  return NextResponse.json({ businesses: rows });
}

/** 店舗追加（無料プランは 1 店舗まで） */
export async function POST(req: Request) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, storeCreateSchema);
  if (!body.ok) return body.response;
  const d = body.data;
  const ownerId = auth.user.id;

  const plan = await getOwnerPlan(ownerId);
  const count = await queryOne<{ count: string }>("SELECT count(*) FROM businesses WHERE owner_id = $1", [ownerId]);
  if (plan?.plan !== "premium" && Number(count?.count) >= 1) {
    return NextResponse.json(
      { error: "無料プランで登録できる店舗は 1 店舗までです", upgradeUrl: "/upgrade" },
      { status: 402 },
    );
  }

  const pos = await geocodeAddress(d.address);
  if (!pos) return NextResponse.json({ error: ADDRESS_NOT_FOUND, field: "address" }, { status: 422 });
  const row = await queryOne<{ id: number }>(
    `INSERT INTO businesses (owner_id, name, address, lat, lng, category, service_description, contact, price_level, is_premium)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [ownerId, d.name, d.address, pos.lat, pos.lng, d.category, d.serviceDescription, d.contact, d.priceLevel, plan?.plan === "premium"],
  );
  return NextResponse.json({ id: row!.id, matched: pos.matched }, { status: 201 });
}

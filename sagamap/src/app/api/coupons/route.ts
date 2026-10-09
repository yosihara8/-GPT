import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { couponCreateSchema } from "@/lib/schemas";
import { parseLatLng } from "@/lib/geo";
import { announceToCustomers } from "@/lib/announce";
import { getOwnerPlan, ownsBusiness, premiumRequired, requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * クーポン取得
 *  - 顧客: 有効なクーポン検索（?lat&lng&radius / category / price）
 *  - 事業主: 自店のクーポン一覧（利用数つき）
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const sp = req.nextUrl.searchParams;

  if (auth.user.role === "business") {
    const rows = await query(
      `SELECT c.*, b.name AS business_name,
              (SELECT count(*) FROM usage_history h WHERE h.coupon_id = c.id AND h.coupon_used)::int AS used_count
         FROM coupons c JOIN businesses b ON b.id = c.business_id
        WHERE b.owner_id = $1 ORDER BY c.created_at DESC`,
      [auth.user.id],
    );
    return NextResponse.json({ coupons: rows });
  }

  const where = ["c.is_active", "c.expires_at > now()"];
  const values: unknown[] = [];
  const here = parseLatLng(sp);
  let distanceSql = "NULL::float";
  if (here) {
    values.push(here.lng, here.lat);
    distanceSql = `ST_Distance(b.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)`;
    const radius = Math.min(Number(sp.get("radius") ?? 5000) || 5000, 50000);
    values.push(radius);
    where.push(`ST_DWithin(b.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $${values.length})`);
  }
  const category = sp.get("category");
  if (category) {
    values.push(category);
    where.push(`b.category = $${values.length}`);
  }
  const price = Number(sp.get("price"));
  if (price >= 1 && price <= 3) {
    values.push(price);
    where.push(`b.price_level = $${values.length}`);
  }

  const rows = await query(
    `SELECT c.id, c.title, c.discount_rate, c.conditions, c.expires_at,
            b.id AS business_id, b.name AS business_name, b.category, b.price_level, b.lat, b.lng,
            ${distanceSql} AS distance_m
       FROM coupons c JOIN businesses b ON b.id = c.business_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${here ? "distance_m" : "c.created_at DESC"}
      LIMIT 100`,
    values,
  );
  return NextResponse.json({ coupons: rows });
}

/** クーポン発行（有料プランのみ） */
export async function POST(req: Request) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const plan = await getOwnerPlan(auth.user.id);
  if (plan?.plan !== "premium") return premiumRequired();

  const body = await parseBody(req, couponCreateSchema);
  if (!body.ok) return body.response;
  const d = body.data;
  if (!(await ownsBusiness(auth.user.id, d.businessId))) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }
  const [row] = await query(
    `INSERT INTO coupons (business_id, title, discount_rate, conditions, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [d.businessId, d.title, d.discountRate, d.conditions, d.expiresAt],
  );
  const announced = d.notify
    ? await announceToCustomers({
        businessId: d.businessId,
        kind: "coupon",
        title: `${d.title}（${d.discountRate}% OFF）`,
        body: `${d.conditions ? `${d.conditions}・` : ""}${d.expiresAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })} まで有効`,
        link: `/dashboard/customer/coupons/${row.id}`,
      })
    : { notified: 0, emailed: 0 };
  return NextResponse.json({ coupon: row, ...announced }, { status: 201 });
}

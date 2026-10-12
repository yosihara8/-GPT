import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { couponCreateSchema } from "@/lib/schemas";
import { parseLatLng } from "@/lib/geo";
import { announceToCustomers } from "@/lib/announce";
import { blockedMessage, checkCoupon } from "@/lib/content-check";
import { decodeJpegBase64 } from "@/lib/upload-image";
import { getOwnerPlan, ownsBusiness, premiumRequired, requireApiUser } from "@/lib/session";
import { COUPON_PUBLIC_COLUMNS, couponHeadline } from "@/lib/coupon";

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
      `SELECT c.id, c.business_id, c.title, c.discount_rate, c.conditions, c.expires_at, c.is_active, c.created_at,
              (c.image IS NOT NULL) AS has_image, b.name AS business_name,
              c.coupon_type, c.amount_yen, c.special_price, c.regular_price, c.benefit, c.max_uses, c.repeatable, c.first_visit_only,
              (SELECT count(*) FROM usage_history h WHERE h.coupon_id = c.id AND h.coupon_used)::int AS used_count,
              (SELECT e.title FROM events e WHERE e.id = c.event_id) AS event_title
         FROM coupons c JOIN businesses b ON b.id = c.business_id
        WHERE b.owner_id = $1 AND c.deleted_at IS NULL ORDER BY c.created_at DESC`,
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
    `SELECT ${COUPON_PUBLIC_COLUMNS("c")},
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
  // イベント限定：公開中で、まだ終わっていないイベントだけ選べる
  if (d.eventId) {
    const ev = await queryOne("SELECT id FROM events WHERE id = $1 AND is_published AND ends_on >= (now() AT TIME ZONE 'Asia/Tokyo')::date", [d.eventId]);
    if (!ev) return NextResponse.json({ error: "選んだイベントは終了したか、見つかりません" }, { status: 400 });
  }
  // 景品表示法などの観点で自動チェック（NG は掲載不可、要注意は運営者が後で確認）
  const check = checkCoupon({
    title: `${d.title}\n${d.benefit}`,
    conditions: d.conditions,
    discount_rate: d.couponType === "percent" ? d.discountRate : undefined,
  });
  if (check.blocked.length) return NextResponse.json({ error: blockedMessage(check), reasons: check.blocked }, { status: 400 });
  // クーポン画像（任意）
  let image: Buffer | null = null;
  if (d.imageBase64) {
    const decoded = decodeJpegBase64(d.imageBase64);
    if (!decoded.ok) return NextResponse.json({ error: decoded.error }, { status: 400 });
    image = decoded.image;
  }
  const [row] = await query(
    `INSERT INTO coupons (business_id, title, discount_rate, conditions, expires_at, review_flags, image, image_type,
                          coupon_type, amount_yen, special_price, regular_price, benefit, max_uses, repeatable, first_visit_only, event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING id, business_id, title, discount_rate, conditions, expires_at, is_active, created_at, (image IS NOT NULL) AS has_image,
               coupon_type, amount_yen, special_price, regular_price, benefit, max_uses, repeatable, first_visit_only`,
    [
      d.businessId,
      d.title,
      d.couponType === "percent" ? d.discountRate : null,
      d.conditions,
      d.expiresAt,
      check.warnings,
      image,
      image ? "image/jpeg" : null,
      d.couponType,
      d.couponType === "yen" ? d.amountYen : null,
      d.couponType === "price" ? d.specialPrice : null,
      d.couponType === "price" ? (d.regularPrice ?? null) : null,
      d.couponType === "gift" ? d.benefit : "",
      d.maxUses ?? null,
      d.repeatable,
      d.firstVisitOnly,
      d.eventId ?? null,
    ],
  );
  const announced = d.notify
    ? await announceToCustomers({
        businessId: d.businessId,
        kind: "coupon",
        title: `${d.title}（${couponHeadline({ coupon_type: d.couponType, discount_rate: d.discountRate, amount_yen: d.amountYen, special_price: d.specialPrice, regular_price: d.regularPrice, benefit: d.benefit })}）`,
        body: `${d.conditions ? `${d.conditions}・` : ""}${d.expiresAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })} まで有効`,
        link: `/dashboard/customer/coupons/${row.id}`,
      })
    : { notified: 0 };
  return NextResponse.json({ coupon: row, warnings: check.warnings, ...announced }, { status: 201 });
}

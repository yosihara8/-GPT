import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { estimateWalkMinutes, parseLatLng } from "@/lib/geo";
import { COUPON_HIGHLIGHT_RADIUS_M } from "@/lib/config";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * 位置情報クエリ（PostGIS）
 * GET /api/search/nearby?lat=33.26&lng=130.29&radius=500&category=カフェ&price=2&coupon=1
 * radius の既定は 500m。徒歩 10 分なら 800 を指定。
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const sp = req.nextUrl.searchParams;
  const here = parseLatLng(sp);
  if (!here) return NextResponse.json({ error: "lat と lng を指定してください" }, { status: 400 });

  const radius = Math.min(Math.max(Number(sp.get("radius") ?? COUPON_HIGHLIGHT_RADIUS_M) || 500, 50), 10000);
  const values: unknown[] = [here.lng, here.lat, radius];
  const where = ["ST_DWithin(b.location, me.geog, $3)"];
  if (sp.get("category")) {
    values.push(sp.get("category"));
    where.push(`b.category = $${values.length}`);
  }
  const price = Number(sp.get("price"));
  if (price >= 1 && price <= 3) {
    values.push(price);
    where.push(`b.price_level = $${values.length}`);
  }
  if (sp.get("coupon") === "1") {
    where.push("EXISTS (SELECT 1 FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now())");
  }

  const rows = await query<{ distance_m: number; best_discount: number | null }>(
    `WITH me AS (SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS geog)
     SELECT b.id, b.name, b.address, b.lat, b.lng, b.category, b.price_level, b.crowd_level,
            ST_Distance(b.location, me.geog) AS distance_m,
            (SELECT max(discount_rate) FROM coupons c
              WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now()) AS best_discount
       FROM businesses b, me
      WHERE ${where.join(" AND ")}
      ORDER BY distance_m
      LIMIT 100`,
    values,
  );

  const results = rows.map((r) => ({
    ...r,
    distance_m: Math.round(r.distance_m),
    walk_minutes: estimateWalkMinutes(r.distance_m),
    highlight: r.best_discount != null && r.distance_m <= COUPON_HIGHLIGHT_RADIUS_M,
  }));
  return NextResponse.json({ center: here, radius, results });
}

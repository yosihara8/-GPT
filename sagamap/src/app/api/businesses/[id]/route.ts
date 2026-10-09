import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { storeUpdateSchema } from "@/lib/schemas";
import { geocodeAddress } from "@/lib/geocode";
import { getOwnerPlan, getSessionUser, ownsBusiness, requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** 店舗詳細。顧客がログイン中なら閲覧履歴を記録し、クーポンも返す */
export async function GET(_req: Request, { params }: Ctx) {
  const id = Number(params.id);
  const biz = await queryOne(
    `SELECT id, name, address, lat, lng, category, service_description, contact, price_level, crowd_level,
            is_premium, instagram_url, twitter_url,
            photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM photo_updated_at)::bigint AS photo_version
       FROM businesses WHERE id = $1`,
    [id],
  );
  if (!biz) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });

  const user = await getSessionUser();
  if (user?.role !== "customer") {
    return NextResponse.json({ business: { ...biz, contact: undefined }, coupons: null, loginRequired: true });
  }

  await query("UPDATE businesses SET view_count = view_count + 1 WHERE id = $1", [id]);
  await query("INSERT INTO usage_history (customer_id, business_id) VALUES ($1, $2)", [user.id, id]);
  const coupons = await query(
    `SELECT id, title, discount_rate, conditions, expires_at FROM coupons
      WHERE business_id = $1 AND is_active AND expires_at > now() ORDER BY discount_rate DESC`,
    [id],
  );
  return NextResponse.json({ business: biz, coupons });
}

const columns: Record<string, string> = {
  name: "name",
  address: "address",
  serviceDescription: "service_description",
  contact: "contact",
  category: "category",
  priceLevel: "price_level",
  crowdLevel: "crowd_level",
  lat: "lat",
  lng: "lng",
  instagramUrl: "instagram_url",
  twitterUrl: "twitter_url",
};

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(params.id);
  if (!(await ownsBusiness(auth.user.id, id))) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }
  const body = await parseBody(req, storeUpdateSchema);
  if (!body.ok) return body.response;
  const d: Record<string, unknown> = { ...body.data };

  // SNS 連携は有料プランのみ
  if (d.instagramUrl !== undefined || d.twitterUrl !== undefined) {
    const plan = await getOwnerPlan(auth.user.id);
    if (plan?.plan !== "premium") {
      return NextResponse.json({ error: "SNS 連携は有料プランの機能です", upgradeUrl: "/upgrade" }, { status: 402 });
    }
  }
  // 住所だけ変わった場合は再ジオコーディング
  if (d.address && (d.lat == null || d.lng == null)) {
    const pos = await geocodeAddress(String(d.address));
    if (pos) Object.assign(d, pos);
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(d)) {
    if (value === undefined || !columns[key]) continue;
    values.push(value === "" && key.endsWith("Url") ? null : value);
    sets.push(`${columns[key]} = $${values.length}`);
  }
  if (sets.length === 0) return NextResponse.json({ error: "更新する項目がありません" }, { status: 400 });
  values.push(id);
  await query(`UPDATE businesses SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(params.id);
  const rows = await query("DELETE FROM businesses WHERE id = $1 AND owner_id = $2 RETURNING id", [id, auth.user.id]);
  if (rows.length === 0) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

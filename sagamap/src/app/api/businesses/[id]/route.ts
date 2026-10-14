import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { storeUpdateSchema } from "@/lib/schemas";
import { ADDRESS_NOT_FOUND, geocodeAddress } from "@/lib/geocode";
import { getOwnerPlan, getSessionUser, ownsBusiness, requireApiUser } from "@/lib/session";
import { COUPON_PUBLIC_COLUMNS } from "@/lib/coupon";
import { SPECIAL_DAYS_SQL } from "@/lib/schedule";
import { PAYMENT_GROUPS } from "@/lib/config";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** 店舗詳細とクーポン。顧客がログイン中なら閲覧履歴を記録する */
export async function GET(_req: Request, { params }: Ctx) {
  const id = Number(params.id);
  const biz = await queryOne(
    `SELECT id, name, address, lat, lng, category, service_description, contact, price_level, crowd_level,
            is_premium, instagram_url, twitter_url, threads_url, facebook_url, youtube_url, tiktok_url, business_hours, closed_days,
            weekly_hours, hours_note, ${SPECIAL_DAYS_SQL("b", -1, 92)} AS special_days,
            amenities, payment_methods, payment_none, website_url, reservation_url, line_url,
            photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM photo_updated_at)::bigint AS photo_version
       FROM businesses b WHERE id = $1`,
    [id],
  );
  if (!biz) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });

  const activeCoupons = () =>
    query(
      `SELECT ${COUPON_PUBLIC_COLUMNS("c")} FROM coupons c
        WHERE c.business_id = $1 AND c.is_active AND c.expires_at > now()
        ORDER BY (c.coupon_type = 'percent') DESC, c.discount_rate DESC NULLS LAST, c.amount_yen DESC NULLS LAST, c.created_at DESC`,
      [id],
    );
  const photos = () =>
    query(`SELECT id, kind, caption FROM business_photos WHERE business_id = $1 ORDER BY sort, id LIMIT 30`, [id]);
  const menu = () =>
    query(
      `SELECT id, name, price, description, (image IS NOT NULL) AS has_image FROM menu_items WHERE business_id = $1 ORDER BY sort, id LIMIT 50`,
      [id],
    );

  const user = await getSessionUser();
  if (user?.role !== "customer") {
    // 未ログインでもクーポンの内容は見られる（利用には会員登録が必要）
    return NextResponse.json({ business: { ...biz, contact: undefined }, coupons: await activeCoupons(), menu: await menu(), photos: await photos(), loginRequired: true });
  }

  await query("UPDATE businesses SET view_count = view_count + 1 WHERE id = $1", [id]);
  await query("INSERT INTO usage_history (customer_id, business_id) VALUES ($1, $2)", [user.id, id]);
  return NextResponse.json({ business: biz, coupons: await activeCoupons(), menu: await menu(), photos: await photos() });
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
  threadsUrl: "threads_url",
  facebookUrl: "facebook_url",
  youtubeUrl: "youtube_url",
  tiktokUrl: "tiktok_url",
  businessHours: "business_hours",
  closedDays: "closed_days",
  amenities: "amenities",
  paymentMethods: "payment_methods",
  paymentNone: "payment_none",
  websiteUrl: "website_url",
  reservationUrl: "reservation_url",
  lineUrl: "line_url",
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

  // 「使えない」を選んだ種類の支払い方法は消す
  if (Array.isArray(d.paymentMethods) && Array.isArray(d.paymentNone)) {
    const none = new Set(d.paymentNone as string[]);
    d.paymentMethods = (d.paymentMethods as string[]).filter((m) => !PAYMENT_GROUPS.some((g) => none.has(g.key) && (g.items as readonly string[]).includes(m)));
  }
  // SNS・ホームページ・予約・LINE のリンクは有料プランのみ
  if ([d.instagramUrl, d.twitterUrl, d.threadsUrl, d.facebookUrl, d.youtubeUrl, d.tiktokUrl, d.websiteUrl, d.reservationUrl, d.lineUrl].some((v) => v !== undefined)) {
    const plan = await getOwnerPlan(auth.user.id);
    if (plan?.plan !== "premium") {
      return NextResponse.json({ error: "SNS・予約・LINE などのリンクは有料プランの機能です", upgradeUrl: "/upgrade" }, { status: 402 });
    }
  }
  // 住所が変わったときは、住所から位置を調べ直す（見つからなければ入力し直してもらう）
  let matched: string | undefined;
  delete d.lat;
  delete d.lng;
  if (d.address) {
    const current = await queryOne<{ address: string }>("SELECT address FROM businesses WHERE id = $1", [id]);
    if (current?.address !== d.address) {
      const pos = await geocodeAddress(String(d.address));
      if (!pos) return NextResponse.json({ error: ADDRESS_NOT_FOUND, field: "address" }, { status: 422 });
      Object.assign(d, { lat: pos.lat, lng: pos.lng });
      matched = pos.matched;
    }
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
  return NextResponse.json({ ok: true, matched });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(params.id);
  const rows = await query("DELETE FROM businesses WHERE id = $1 AND owner_id = $2 RETURNING id", [id, auth.user.id]);
  if (rows.length === 0) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

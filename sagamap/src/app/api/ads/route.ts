import { NextResponse } from "next/server";
import { blockedMessage, checkAd } from "@/lib/content-check";
import { decodeJpegBase64 } from "@/lib/upload-image";
import { query } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { adCreateSchema } from "@/lib/schemas";
import { announceToCustomers } from "@/lib/announce";
import { queryOne } from "@/lib/db";
import { ADS_PER_MONTH } from "@/lib/config";
import { getOwnerPlan, getSessionUser, ownsBusiness, premiumRequired, requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 今月（日本時間の 1 日〜末日）に出稿した回数 */
async function adsThisMonth(ownerId: number) {
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM ads a JOIN businesses b ON b.id = a.business_id
      WHERE b.owner_id = $1
        AND date_trunc('month', a.created_at AT TIME ZONE 'Asia/Tokyo') = date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo')`,
    [ownerId],
  );
  return row?.n ?? 0;
}

/** 地図上バナー広告。事業主は自分の広告一覧と今月の残り回数、それ以外は配信中の広告 */
export async function GET() {
  const user = await getSessionUser();
  if (user?.role === "business") {
    const rows = await query(
      `SELECT a.id, a.business_id, a.headline, a.body, a.starts_at, a.ends_at, a.is_active, a.created_at,
              (a.image IS NOT NULL) AS has_image, b.name AS business_name
         FROM ads a JOIN businesses b ON b.id = a.business_id
        WHERE b.owner_id = $1 ORDER BY a.created_at DESC`,
      [user.id],
    );
    const used = await adsThisMonth(user.id);
    return NextResponse.json({ ads: rows, limit: ADS_PER_MONTH, used, remaining: Math.max(0, ADS_PER_MONTH - used) });
  }
  const rows = await query(
    `SELECT a.id, a.headline, a.body, (a.image IS NOT NULL) AS has_image, b.id AS business_id, b.name AS business_name, b.lat, b.lng
       FROM ads a JOIN businesses b ON b.id = a.business_id
      WHERE a.is_active AND b.is_premium AND now() BETWEEN a.starts_at AND a.ends_at
      ORDER BY random() LIMIT 5`,
  );
  return NextResponse.json({ ads: rows });
}

/** 広告出稿（有料プランのみ） */
export async function POST(req: Request) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  if ((await getOwnerPlan(auth.user.id))?.plan !== "premium") return premiumRequired();
  if ((await adsThisMonth(auth.user.id)) >= ADS_PER_MONTH) {
    return NextResponse.json(
      { error: `広告の出稿は月 ${ADS_PER_MONTH} 回までです。来月 1 日から再び出稿できます` },
      { status: 429 },
    );
  }
  const body = await parseBody(req, adCreateSchema);
  if (!body.ok) return body.response;
  const d = body.data;
  if (!(await ownsBusiness(auth.user.id, d.businessId))) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }
  // 景品表示法などの観点で自動チェック（NG は掲載不可、要注意は運営者が後で確認）
  const check = checkAd({ headline: d.headline, body: d.body });
  if (check.blocked.length) return NextResponse.json({ error: blockedMessage(check), reasons: check.blocked }, { status: 400 });
  // 広告画像（任意）
  let image: Buffer | null = null;
  if (d.imageBase64) {
    const decoded = decodeJpegBase64(d.imageBase64);
    if (!decoded.ok) return NextResponse.json({ error: decoded.error }, { status: 400 });
    image = decoded.image;
  }
  const [ad] = await query(
    `INSERT INTO ads (business_id, headline, body, ends_at, review_flags, image, image_type)
     VALUES ($1, $2, $3, now() + make_interval(days => $4), $5, $6, $7)
     RETURNING id, business_id, headline, body, starts_at, ends_at, is_active, created_at, (image IS NOT NULL) AS has_image`,
    [d.businessId, d.headline, d.body, d.days, check.warnings, image, image ? "image/jpeg" : null],
  );
  const announced = d.notify
    ? await announceToCustomers({
        businessId: d.businessId,
        kind: "ad",
        title: d.headline,
        body: d.body || "地図でお店をチェックしてみてください。",
        link: `/dashboard/customer?shop=${d.businessId}`,
      })
    : { notified: 0 };
  return NextResponse.json({ ad, warnings: check.warnings, ...announced }, { status: 201 });
}

/** 広告の停止: DELETE /api/ads?id= */
export async function DELETE(req: Request) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(new URL(req.url).searchParams.get("id"));
  const rows = await query(
    `UPDATE ads a SET is_active = false FROM businesses b
      WHERE a.id = $1 AND b.id = a.business_id AND b.owner_id = $2 RETURNING a.id`,
    [id, auth.user.id],
  );
  if (rows.length === 0) return NextResponse.json({ error: "広告が見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

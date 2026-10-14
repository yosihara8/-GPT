import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { EVENT_COLUMNS, type SagaEvent } from "@/lib/events";
import { COUPON_PUBLIC_COLUMNS } from "@/lib/coupon";

export const dynamic = "force-dynamic";

/** イベント特集のページ：イベントの内容・限定クーポン・参加しているお店（だれでも見られる） */
export async function GET(_req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const event = await queryOne<SagaEvent>(`SELECT ${EVENT_COLUMNS("e")} FROM events e WHERE e.slug = $1 AND e.is_published`, [params.slug]);
  if (!event) return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  const coupons = await query(
    `SELECT ${COUPON_PUBLIC_COLUMNS("c")}, b.id AS business_id, b.name AS business_name, b.category, b.lat, b.lng,
            b.photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM b.photo_updated_at)::bigint AS photo_version
       FROM coupons c JOIN businesses b ON b.id = c.business_id
      WHERE c.event_id = $1 AND c.is_active AND c.expires_at > now() AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC LIMIT 100`,
    [event.id],
  );
  return NextResponse.json({ event, coupons });
}

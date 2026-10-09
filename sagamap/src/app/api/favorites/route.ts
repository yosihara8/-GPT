import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** お気に入りの店舗一覧 */
export async function GET() {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const favorites = await query(
    `SELECT b.id, b.name, b.address, b.lat, b.lng, b.category, b.price_level,
            (SELECT max(discount_rate) FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now()) AS best_discount
       FROM favorites f JOIN businesses b ON b.id = f.business_id
      WHERE f.customer_id = $1 ORDER BY f.created_at DESC`,
    [auth.user.id],
  );
  return NextResponse.json({ favorites });
}

const schema = z.object({ businessId: z.coerce.number().int().positive() });

/** お気に入りに追加 */
export async function POST(req: Request) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  await query(
    `INSERT INTO favorites (customer_id, business_id)
     SELECT $1, id FROM businesses WHERE id = $2 ON CONFLICT DO NOTHING`,
    [auth.user.id, body.data.businessId],
  );
  return NextResponse.json({ ok: true });
}

/** お気に入りから外す: DELETE /api/favorites?businessId= */
export async function DELETE(req: Request) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const id = Number(new URL(req.url).searchParams.get("businessId"));
  await query("DELETE FROM favorites WHERE customer_id = $1 AND business_id = $2", [auth.user.id, id]);
  return NextResponse.json({ ok: true });
}

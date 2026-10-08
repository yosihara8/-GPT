import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 利用履歴（閲覧・クーポン利用） */
export async function GET() {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const rows = await query(
    `SELECT h.id, h.viewed_at, h.coupon_used, b.id AS business_id, b.name AS business_name, b.category,
            c.title AS coupon_title, c.discount_rate
       FROM usage_history h
       JOIN businesses b ON b.id = h.business_id
       LEFT JOIN coupons c ON c.id = h.coupon_id
      WHERE h.customer_id = $1
      ORDER BY h.viewed_at DESC LIMIT 100`,
    [auth.user.id],
  );
  return NextResponse.json({ history: rows });
}

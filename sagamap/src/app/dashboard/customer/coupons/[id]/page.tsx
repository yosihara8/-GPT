import { notFound, redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * メール・お知らせのクーポンのリンク: /dashboard/customer/coupons/[id]
 * どこから開いても同じ画面になるよう、地図の画面の「お店のページ」で、そのクーポンを上に出して開く。
 */
export default async function CouponPage({ params }: { params: { id: string } }) {
  await requirePageUser("customer", `/dashboard/customer/coupons/${params.id}`);
  const c = await queryOne<{ business_id: number; live: boolean }>(
    `SELECT business_id, (deleted_at IS NULL AND is_active AND expires_at > now()) AS live FROM coupons WHERE id = $1`,
    [Number(params.id)],
  );
  if (!c) notFound();
  redirect(c.live ? `/?shop=${c.business_id}&coupon=${Number(params.id)}` : `/?shop=${c.business_id}`);
}

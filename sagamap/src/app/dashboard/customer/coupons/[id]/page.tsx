import Link from "next/link";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** メール通知からのリンク先: /dashboard/customer/coupons/[id] */
export default async function CouponPage({ params }: { params: { id: string } }) {
  await requirePageUser("customer", `/dashboard/customer/coupons/${params.id}`);
  const c = await queryOne<{
    title: string;
    discount_rate: number;
    conditions: string;
    expires_at: Date;
    business_id: number;
    business_name: string;
    address: string;
    ended: boolean;
    has_image: boolean;
  }>(
    `SELECT c.title, c.discount_rate, c.conditions, c.expires_at, b.id AS business_id, b.name AS business_name, b.address,
            (c.deleted_at IS NOT NULL OR NOT c.is_active) AS ended, (c.image IS NOT NULL) AS has_image
       FROM coupons c JOIN businesses b ON b.id = c.business_id WHERE c.id = $1`,
    [Number(params.id)],
  );
  if (!c) notFound();
  const expired = c.ended || c.expires_at.getTime() < Date.now();

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="card mt-4 overflow-hidden border-dashed border-coupon/40 p-0 text-center">
        {c.has_image && !c.ended && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/coupons/${params.id}/image`} alt="" className="h-44 w-full object-cover" />
        )}
        <div className="p-4">
        <p className="text-sm text-slate-500">{c.business_name}</p>
        <p className="mt-2 text-5xl font-bold text-coupon">{c.discount_rate}% OFF</p>
        <p className="mt-2 font-semibold">{c.title}</p>
        {c.conditions && <p className="mt-1 text-sm text-slate-600">{c.conditions}</p>}
        <p className="mt-3 text-xs text-slate-500">
          {c.ended ? "このクーポンは配信が終了しました" : expired ? "このクーポンは期限切れです" : `${c.expires_at.toLocaleDateString("ja-JP")} まで有効`}
        </p>
        <p className="mt-1 text-xs text-slate-500">{c.address}</p>
        </div>
      </div>
      <Link href={`/dashboard/customer?shop=${c.business_id}`} className="btn-primary mt-4 w-full">
        地図でお店を見る
      </Link>
    </main>
  );
}

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
  }>(
    `SELECT c.title, c.discount_rate, c.conditions, c.expires_at, b.id AS business_id, b.name AS business_name, b.address
       FROM coupons c JOIN businesses b ON b.id = c.business_id WHERE c.id = $1`,
    [Number(params.id)],
  );
  if (!c) notFound();
  const expired = c.expires_at.getTime() < Date.now();

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="card mt-4 border-2 border-dashed border-coupon/50 text-center">
        <p className="text-sm text-slate-500">{c.business_name}</p>
        <p className="mt-2 text-5xl font-black text-coupon">{c.discount_rate}% OFF</p>
        <p className="mt-2 font-semibold">{c.title}</p>
        {c.conditions && <p className="mt-1 text-sm text-slate-600">{c.conditions}</p>}
        <p className="mt-3 text-xs text-slate-500">
          {expired ? "このクーポンは期限切れです" : `${c.expires_at.toLocaleDateString("ja-JP")} まで有効`}
        </p>
        <p className="mt-1 text-xs text-slate-500">{c.address}</p>
      </div>
      <Link href={`/dashboard/customer?shop=${c.business_id}`} className="btn-primary mt-4 w-full">
        地図でお店を見る
      </Link>
    </main>
  );
}

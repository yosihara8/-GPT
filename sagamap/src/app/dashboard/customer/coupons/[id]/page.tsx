import Link from "next/link";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { couponBadge } from "@/lib/coupon";

export const dynamic = "force-dynamic";

/** メール通知からのリンク先: /dashboard/customer/coupons/[id] */
export default async function CouponPage({ params }: { params: { id: string } }) {
  await requirePageUser("customer", `/dashboard/customer/coupons/${params.id}`);
  const c = await queryOne<{
    title: string;
    discount_rate: number | null;
    coupon_type: string;
    amount_yen: number | null;
    special_price: number | null;
    regular_price: number | null;
    benefit: string;
    conditions: string;
    expires_at: Date;
    business_id: number;
    business_name: string;
    address: string;
    ended: boolean;
    has_image: boolean;
  }>(
    `SELECT c.title, c.discount_rate, c.coupon_type, c.amount_yen, c.special_price, c.regular_price, c.benefit, c.conditions, c.expires_at, b.id AS business_id, b.name AS business_name, b.address,
            (c.deleted_at IS NOT NULL OR NOT c.is_active) AS ended, (c.image IS NOT NULL) AS has_image
       FROM coupons c JOIN businesses b ON b.id = c.business_id WHERE c.id = $1`,
    [Number(params.id)],
  );
  if (!c) notFound();
  const expired = c.ended || c.expires_at.getTime() < Date.now();

  return (
    <main className="karakusa min-h-[70vh] bg-saga-600 px-4 pb-8 pt-6">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-3xl bg-[#FAF6EF] text-center shadow-[0_20px_40px_rgba(10,20,40,0.35)]">
          {c.has_image && !c.ended && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/coupons/${params.id}/image`} alt="" className="h-44 w-full object-cover" />
          )}
          <div className="px-5 pb-6 pt-5">
            <p className="num text-[11px] font-bold tracking-[0.3em] text-asa-500">COUPON</p>
            <p className="mt-1 font-mincho text-lg font-bold text-slate-900">{c.business_name}</p>
            <p className={`mt-3 font-num font-extrabold leading-none ${expired ? "text-slate-400" : "text-coupon"}`}>
              {c.coupon_type === "gift" ? (
                <span className="text-3xl leading-snug">{c.benefit || "特典サービス"}</span>
              ) : (
                <>
                  <span className="text-7xl tracking-tight">{couponBadge(c).main}</span>
                  <span className="text-3xl">{couponBadge(c).sub}</span>
                </>
              )}
            </p>
            <p className="mt-3 font-mincho text-base font-bold">{c.title}</p>
            {c.conditions && <p className="mt-1 text-sm text-slate-600">{c.conditions}</p>}
            <div className="my-4 border-t-2 border-dashed border-slate-300" aria-hidden />
            <p className={`text-sm font-bold ${expired ? "text-slate-500" : "text-saga-600"}`}>
              {c.ended ? "このクーポンは配信が終了しました" : expired ? "このクーポンは期限切れです" : `${c.expires_at.toLocaleDateString("ja-JP")} まで有効`}
            </p>
            <p className="mt-1 text-xs text-slate-500">{c.address}</p>
          </div>
        </div>
        <Link href={`/?shop=${c.business_id}`} className="btn mt-5 w-full bg-white py-3 text-saga-600 hover:bg-slate-50">
          地図でお店を見る
        </Link>
      </div>
    </main>
  );
}

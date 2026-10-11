/* eslint-disable @next/next/no-img-element */

export type CouponInfo = {
  id: number;
  title: string;
  discount_rate: number;
  conditions?: string | null;
  expires_at: string;
  has_image?: boolean;
};

/** クーポンの表示（写真があれば上に大きく表示）。右側に「使う」などのボタンを置ける */
export default function CouponRow({ coupon: c, action, note }: { coupon: CouponInfo; action?: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-dashed border-coupon/40 bg-coral-50/60">
      {c.has_image && <img src={`/api/coupons/${c.id}/image`} alt="" className="h-36 w-full object-cover" loading="lazy" />}
      <div className="flex items-center gap-3 p-3">
        <span className="shrink-0 text-2xl font-bold tabular-nums text-coupon">{c.discount_rate}%</span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="block font-semibold">{c.title}</span>
          <span className="text-xs text-slate-500">
            {c.conditions && `${c.conditions}・`}
            {new Date(c.expires_at).toLocaleDateString("ja-JP")}まで
          </span>
          {note}
        </span>
        {action}
      </div>
    </div>
  );
}

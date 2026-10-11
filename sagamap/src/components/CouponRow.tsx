/* eslint-disable @next/next/no-img-element */

export type CouponInfo = {
  id: number;
  title: string;
  discount_rate: number;
  conditions?: string | null;
  expires_at: string;
  has_image?: boolean;
};

/** クーポンの表示（切り取り線つきのチケット。写真があれば上に大きく表示）。右側に「使う」などのボタンを置ける */
export default function CouponRow({ coupon: c, action, note }: { coupon: CouponInfo; action?: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(20,40,77,0.05),0_6px_16px_rgba(20,40,77,0.07)] ring-1 ring-slate-200/70">
      {c.has_image && <img src={`/api/coupons/${c.id}/image`} alt="" className="h-36 w-full object-cover" loading="lazy" />}
      <div className="flex items-stretch">
        <div className="relative flex w-[76px] shrink-0 flex-col items-center justify-center bg-coupon px-1 py-3 text-white">
          <span className="num text-[26px] font-extrabold leading-none">
            {c.discount_rate}
            <span className="text-sm">%</span>
          </span>
          <span className="num mt-1 text-[10px] font-bold tracking-[0.2em]">OFF</span>
          {/* 切り取り線 */}
          <span className="absolute -right-[5px] top-0 h-full w-[10px] bg-[radial-gradient(circle,#fff_3px,transparent_3.5px)] bg-[length:10px_12px] bg-repeat-y" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-3">
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-bold">{c.title}</span>
            <span className="text-xs text-slate-500">
              {c.conditions && `${c.conditions}・`}
              {new Date(c.expires_at).toLocaleDateString("ja-JP")}まで
            </span>
            {note}
          </span>
          {action}
        </div>
      </div>
    </div>
  );
}

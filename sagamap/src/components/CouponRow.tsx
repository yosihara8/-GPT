"use client";

/* eslint-disable @next/next/no-img-element */
import { couponBadge, couponRules, type CouponValue } from "@/lib/coupon";
import { useT } from "@/components/LangProvider";

export type CouponInfo = CouponValue & {
  id: number;
  title: string;
  conditions?: string | null;
  expires_at: string;
  has_image?: boolean;
  max_uses?: number | null;
  used_count?: number | null;
  repeatable?: boolean | null;
  first_visit_only?: boolean | null;
};

const TONES = { red: "bg-coupon", gold: "bg-sun-500", green: "bg-tea-600" } as const;

/** チケットの左側（種類ごとに色を変える：割引＝赤／特別価格＝金／特典＝緑） */
export function CouponStub({ coupon, size = "md" }: { coupon: CouponValue; size?: "md" | "lg" }) {
  const b = couponBadge(coupon);
  const t = useT();
  const long = b.main.length > 4;
  return (
    <span className={`relative flex shrink-0 flex-col items-center justify-center px-1 text-white ${TONES[b.tone]} ${size === "lg" ? "w-[96px] py-4" : "w-[80px] py-3"}`}>
      <span className={`num font-extrabold leading-none ${long ? "text-[18px]" : size === "lg" ? "text-[32px]" : "text-[26px]"}`}>{t(b.main)}</span>
      <span className="num mt-1 text-[10px] font-bold tracking-[0.12em]">{t(b.sub)}</span>
      {/* 切り取り線 */}
      <span className="absolute -right-[5px] top-0 h-full w-[10px] bg-[radial-gradient(circle,#fff_3px,transparent_3.5px)] bg-[length:10px_12px] bg-repeat-y" aria-hidden />
    </span>
  );
}

/** クーポンの表示（切り取り線つきのチケット。写真があれば上に大きく表示）。右側に「使う」などのボタンを置ける */
export default function CouponRow({ coupon: c, action, note }: { coupon: CouponInfo; action?: React.ReactNode; note?: React.ReactNode }) {
  const rules = couponRules(c);
  const t = useT();
  return (
    <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(20,40,77,0.05),0_6px_16px_rgba(20,40,77,0.07)] ring-1 ring-slate-200/70">
      {c.has_image && <img src={`/api/coupons/${c.id}/image`} alt="" className="h-36 w-full object-cover" loading="lazy" />}
      <div className="flex items-stretch">
        <CouponStub coupon={c} />
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-3">
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-bold">{c.title}</span>
            {c.coupon_type === "gift" && c.benefit && <span className="block text-xs font-bold text-tea-700">{c.benefit}</span>}
            <span className="text-xs text-slate-500">
              {c.conditions && `${c.conditions}・`}
              {t("{d}まで", { d: new Date(c.expires_at).toLocaleDateString("ja-JP") })}・{rules.map((r) => t(r)).join("・")}
            </span>
            {note}
          </span>
          {action}
        </div>
      </div>
    </div>
  );
}

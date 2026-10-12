"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { PHOTO_LIMIT } from "@/lib/config";

type StoreLike = {
  has_photo: boolean;
  gallery_count?: number;
  menu_count?: number;
  active_coupons?: number;
  service_description: string;
  contact: string;
  weekly_hours?: unknown;
  business_hours?: string;
  amenities?: string[];
  payment_methods?: string[];
  payment_none?: string[];
  reservation_url?: string | null;
  line_url?: string | null;
  instagram_url?: string | null;
};

/**
 * お店のページの充実度（Google のビジネスプロフィールのように、足りない情報を 1 つずつ案内する）。
 * 写真・メニュー・営業時間などがそろうほど、お客さまが「行ってみよう」と決めやすくなる。
 */
export default function ProfileScore({ store, premium }: { store: StoreLike; premium: boolean }) {
  const photoGoal = Math.min(5, premium ? PHOTO_LIMIT.premium : PHOTO_LIMIT.free);
  const items: { label: string; hint: string; done: boolean; href: string }[] = [
    { label: "メイン写真", hint: "一覧と地図で最初に目に入る 1 枚", done: store.has_photo, href: "#sec-main-photo" },
    {
      label: `お店の写真 ${photoGoal} 枚以上（いま ${store.gallery_count ?? 0} 枚）`,
      hint: "外観・店内・客席・商品。写真が多いお店ほど選ばれます",
      done: (store.gallery_count ?? 0) >= photoGoal,
      href: "#sec-photos",
    },
    { label: "お店の紹介文（50 文字以上）", hint: "こだわり・おすすめ・雰囲気", done: (store.service_description ?? "").length >= 50, href: "#sec-store" },
    { label: "電話番号", hint: "タップで電話できるようになります", done: Boolean(store.contact), href: "#sec-store" },
    { label: "営業カレンダー", hint: "「営業中」の表示・臨時休業のお知らせ", done: Boolean(store.weekly_hours), href: "#sec-schedule" },
    {
      label: "お支払い方法",
      hint: "PayPay・交通系IC などが使えるか",
      done: (store.payment_methods?.length ?? 0) > 0 || (store.payment_none?.length ?? 0) > 0,
      href: "#sec-store",
    },
    { label: "お店の特徴", hint: "駐車場・テイクアウト・子ども連れ歓迎など", done: (store.amenities?.length ?? 0) > 0, href: "#sec-store" },
    { label: "メニュー・商品 3 品以上", hint: "写真と価格つきで", done: (store.menu_count ?? 0) >= 3, href: "#sec-menu" },
    {
      label: "配信中のクーポン",
      hint: premium ? "来店のいちばんのきっかけになります" : "有料プランで配信できます",
      done: (store.active_coupons ?? 0) > 0,
      href: premium ? "/dashboard/business/coupons" : "/upgrade",
    },
  ];
  if (premium) {
    items.push({
      label: "予約・LINE・SNS のリンク",
      hint: "お客さまがその場で予約・友だち追加",
      done: Boolean(store.reservation_url || store.line_url || store.instagram_url),
      href: "#sec-store",
    });
  }
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const todo = items.filter((i) => !i.done);

  return (
    <section className="card space-y-3" aria-label="お店のページの充実度">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-bold">お店のページの充実度</h2>
          <p className="text-xs text-slate-500">
            {todo.length === 0 ? "すべてそろっています。季節ごとに写真やクーポンを新しくしましょう。" : `あと ${todo.length} 項目で、お客さまに伝わるお店のページになります。`}
          </p>
        </div>
        <p className="num shrink-0 text-3xl font-extrabold text-saga-700">
          {pct}
          <span className="text-base">%</span>
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct === 100 ? "bg-tea-500" : "bg-asa-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <ul className="divide-y divide-slate-100">
        {[...todo, ...items.filter((i) => i.done)].map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="flex items-center gap-3 py-2.5">
              {i.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-tea-500" aria-label="済み" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="まだ" />}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-bold ${i.done ? "text-slate-400" : ""}`}>{i.label}</span>
                {!i.done && <span className="block text-xs text-slate-500">{i.hint}</span>}
              </span>
              {!i.done && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

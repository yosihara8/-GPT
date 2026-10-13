"use client";

import { Check, Lock } from "lucide-react";

/** プランの中身（ダッシュボードの設定とプランの画面で共通） */
export const FREE_FEATURES = ["お店の掲載（1 店舗）", "写真 3 枚・メニュー・営業カレンダー・支払い方法", "お店に来ようとしたお客さまの数・月次レポート", "レジ横 QR ポスター・SNS で宣伝"];
export const PREMIUM_FEATURES = [
  "クーポン発行（％引き・円引き・特別価格・特典／イベント限定）",
  "広告出稿（地図の画面の PR 枠・月 2 回まで）",
  "予約・LINE・ホームページ・SNS の連携ボタン",
  "お店の写真 20 枚まで",
  "紹介割引（月 10 名の紹介で翌月 2,980 円）",
  "複数店舗の登録",
];

export function PlanCard(props: { current: boolean; title: string; price: string; note?: string; features: string[]; tone: "tea" | "coral" }) {
  return (
    <div className={`card relative ${props.current ? "border-saga-600 ring-2 ring-saga-600" : props.tone === "coral" ? "ring-1 ring-asa-500/40" : ""}`}>
      {props.current && (
        <span className="absolute -top-2.5 left-4 rounded-md bg-saga-600 px-2 py-0.5 text-[11px] font-semibold text-white">ご利用中</span>
      )}
      <p className="mt-1 text-base font-semibold text-slate-700">{props.title}</p>
      <p className="num text-2xl font-bold tracking-tight">{props.price}</p>
      {props.note && <p className="text-xs font-bold text-saga-700">{props.note}</p>}
      <ul className="mt-3 space-y-1.5 text-sm">
        {props.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            {props.current ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-saga-600" aria-hidden />
            ) : props.tone === "coral" ? (
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            ) : (
              <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-slate-400">・</span>
            )}
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}


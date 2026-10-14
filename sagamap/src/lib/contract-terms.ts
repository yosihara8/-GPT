import { PRICE_DISCOUNT, PRICE_STANDARD, REFERRAL_GOAL } from "@/lib/config";

/**
 * 有料プランの契約条件（特定商取引法に基づく表記と、申し込み直前の最終確認で同じ文言を使う）
 */
export const PAID_PLAN_TERMS = {
  price: `月額 ${PRICE_STANDARD.toLocaleString()} 円（税込）。前月 1 日〜末日の紹介が ${REFERRAL_GOAL} 名以上の場合、翌月は ${PRICE_DISCOUNT.toLocaleString()} 円（税込）`,
  extraCost:
    "送料・決済手数料・初期費用・入会金・解約手数料はかかりません（インターネットの通信料金はお客さまのご負担です）",
  payment:
    "クレジットカード（Visa / Mastercard / JCB / American Express 等）。決済は Stripe を通じて行います",
  paymentTiming:
    "お申し込み時に初回 1 か月分を決済し、以降は毎月の更新日（お申し込み日と同じ日。その日がない月は月末）に自動で決済します",
  delivery: "決済完了後、ただちに有料プランの機能をご利用いただけます",
  renewal:
    "1 か月ごとの自動更新の継続契約です。解約の手続きをするまで、毎月同じ条件で自動的に更新されます",
  cancelDeadline:
    "次回更新日の前日までに解約の手続きをすると、次回以降の請求は発生しません",
  cancelHow:
    "事業主画面の「設定」→「プランを変更する」→「無料プラン」を選び、「解約の手続きへ（Stripe）」から解約できます（いつでも可能・解約手数料なし）",
  afterCancel:
    "解約後も、お支払い済みの期間の最終日までは有料プランを利用でき、その翌日から無料プランに戻ります（お店の掲載は無料プランで続きます）",
  refund:
    "デジタルサービスの性質上、決済後の返金・月の途中での日割り返金はいたしません（法令に定める場合を除きます）",
} as const;

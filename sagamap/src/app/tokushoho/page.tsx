import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { OPERATOR, PRICE_DISCOUNT, PRICE_STANDARD, REFERRAL_GOAL } from "@/lib/config";

export const metadata: Metadata = { title: "特定商取引法に基づく表記" };

const rows: [string, string][] = [
  ["販売事業者", OPERATOR.name],
  ["運営統括責任者", OPERATOR.representative],
  ["所在地", OPERATOR.address],
  ["電話番号", OPERATOR.phone],
  ["メールアドレス", OPERATOR.email],
  ["販売価格", `事業者向け有料プラン 月額 ${PRICE_STANDARD.toLocaleString()} 円（税込）（前月 1 日〜末日の紹介が ${REFERRAL_GOAL} 名以上の場合、翌月は ${PRICE_DISCOUNT.toLocaleString()} 円・税込）`],
  ["商品代金以外の必要料金", "インターネット接続料金・通信料金はお客さまのご負担となります"],
  ["支払方法", "クレジットカード（Visa / Mastercard / JCB / American Express 等）、Apple Pay、Google Pay"],
  ["支払時期", "お申し込み時に初回分を決済し、以降は毎月の更新日に自動で決済されます"],
  ["提供時期", "決済完了後、ただちに有料プランの機能をご利用いただけます"],
  ["解約・返金", "ダッシュボードの「プラン・お支払い管理」からいつでも解約できます。解約後は次回更新日以降の請求が停止します。月の途中で解約した場合の日割り返金はありません"],
  ["動作環境", "最新版の Google Chrome / Safari / Microsoft Edge / Firefox（スマートフォン・パソコン）"],
];

export default function TokushohoPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記" updated="2026年10月9日">
      <table className="w-full text-left">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t align-top">
              <th className="w-1/3 py-3 pr-3 font-bold text-slate-900">{k}</th>
              <td className="py-3">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LegalPage>
  );
}

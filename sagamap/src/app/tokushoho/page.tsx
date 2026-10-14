import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { OPERATOR } from "@/lib/config";
import { PAID_PLAN_TERMS as T } from "@/lib/contract-terms";

export const metadata: Metadata = { title: "特定商取引法に基づく表記" };

const rows: [string, React.ReactNode][] = [
  ["販売事業者", OPERATOR.legalName ? `${OPERATOR.legalName}（屋号：${OPERATOR.name}）` : `${OPERATOR.name}（氏名は、請求があった場合には遅滞なく電子メールにて開示いたします）`],
  ["運営統括責任者", OPERATOR.representative],
  ["所在地", OPERATOR.address],
  ["電話番号", OPERATOR.phone],
  ["メールアドレス", OPERATOR.email],
  ["サービスの名称", `${OPERATOR.serviceName}（事業者向けの店舗掲載・集客サービス）`],
  [
    "販売価格",
    <>
      無料プラン：0 円
      <br />
      有料プラン：{T.price}
      <br />
      特別招待プラン：0 円（運営者が発行する招待リンクから登録した事業者のみ）
      <br />
      ※ 広告出稿（月 2 回まで）は有料プランに含まれ、追加料金はかかりません。お客さま（一般の利用者）のご利用は無料です。
    </>,
  ],
  ["商品代金以外の必要料金", T.extraCost],
  ["支払方法", T.payment],
  ["支払時期", T.paymentTiming],
  ["サービスの提供時期", T.delivery],
  ["申込みの有効期限", "お申し込みの期限はありません（いつでもお申し込みいただけます）。なお、特別招待リンクは発行から 3 日間有効です"],
  [
    "継続契約（自動更新）について",
    <>
      {T.renewal}
      <br />
      更新日：お申し込み日と同じ日（その日がない月は月末）
      <br />
      解約期限：{T.cancelDeadline}
    </>,
  ],
  [
    "解約・キャンセル",
    <>
      {T.cancelHow}
      <br />
      {T.afterCancel}
    </>,
  ],
  ["返品・返金", T.refund],
  [
    "サービスに不具合があった場合",
    "有料プランの機能が正しく動かない・利用できない場合は、上記メールアドレスへご連絡ください。原因を調査のうえ、速やかに復旧・対応します。運営者の責めに帰すべき事由により利用できなかった期間がある場合は、その期間に応じた返金または翌月以降の料金からの減額により対応します",
  ],
  ["動作環境", "最新版の Google Chrome / Safari / Microsoft Edge / Firefox（スマートフォン・パソコン）。JavaScript と Cookie を有効にしてご利用ください"],
];

export default function TokushohoPage() {
  return (
    <LegalPage title="特定商取引法に基づく表記" updated="2026年10月14日">
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
      <p className="text-xs text-slate-500">
        ご利用の条件は<Link href="/terms" className="underline">利用規約</Link>、個人情報の取り扱いは<Link href="/privacy" className="underline">プライバシーポリシー</Link>をご覧ください。
      </p>
    </LegalPage>
  );
}

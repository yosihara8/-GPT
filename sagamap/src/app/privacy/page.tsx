import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { OPERATOR } from "@/lib/config";

export const metadata: Metadata = { title: "プライバシーポリシー" };

/** 業務委託先（外国にある第三者） */
const PROCESSORS: [string, string, string][] = [
  ["Vercel Inc.", "アメリカ合衆国", "サーバー（本サービスの配信・処理）"],
  ["Neon Inc.", "アメリカ合衆国", "データベース（会員情報・店舗情報等の保管）"],
  ["Stripe, Inc.", "アメリカ合衆国", "有料プランの決済（カード情報は Stripe が直接取得）"],
  ["Resend（Plus Five Five, Inc.）", "アメリカ合衆国", "メール送信（宛先メールアドレス・氏名・本文）"],
  ["Google LLC（Gmail）", "アメリカ合衆国", "運営者のメール（お問い合わせへの対応、月次バックアップの受信）"],
];

/** 利用者の端末からの外部送信 */
const EXTERNAL: [string, string, string][] = [
  ["国土地理院（地理院タイル）", "IP アドレス、表示している地図の範囲、ブラウザの種類", "地図の表示"],
  ["Google LLC（Google Fonts）", "IP アドレス、ブラウザの種類、閲覧ページ", "画面の文字（フォント）の表示"],
  ["Google LLC（Google マップ ※有効時のみ）", "IP アドレス、表示している地図の範囲、ブラウザの種類", "地図・道順の表示"],
  ["Stripe, Inc.", "IP アドレス、ブラウザの種類、決済情報", "決済画面の表示と決済処理（有料プラン申込時のみ）"],
];

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updated="2026年10月10日">
      <p>
        {OPERATOR.name}（以下「運営者」）は、「{OPERATOR.serviceName}」（以下「本サービス」）における利用者の個人情報を、個人情報保護法その他の法令に従い、以下のとおり取り扱います。
      </p>
      <h2>1. 取得する情報</h2>
      <ul>
        <li>会員登録情報：氏名、メールアドレス、パスワード（暗号化して保存）、興味のある業種</li>
        <li>事業者情報：店舗名、住所、連絡先、業種、サービス内容、店舗写真、SNS アカウント</li>
        <li>
          位置情報：お客さまの端末の現在地（周辺店舗の検索・距離計算に使用）。あわせて、人の流れの統計のため、地図を開いた場所（約 100m 単位に丸めたもの）と時刻を、<b>誰の記録か分からない形</b>で保存します
        </li>
        <li>利用履歴：店舗の閲覧、クーポンの利用、紹介リンク経由の登録</li>
        <li>決済情報：クレジットカード情報は決済代行会社（Stripe, Inc.）が直接取得し、運営者は保持しません</li>
        <li>技術情報：IP アドレス、ブラウザの種類、エラーの記録、Cookie（ログイン状態の保持に使用）</li>
      </ul>
      <h2>2. 利用目的</h2>
      <ul>
        <li>本サービスの提供（地図表示、店舗検索、クーポン、AI によるおすすめ）</li>
        <li>有料プランの料金請求、紹介割引の適用</li>
        <li>新着クーポン・イベント等のお知らせメールの送信（配信停止可能）</li>
        <li>不正利用の防止、セキュリティの確保、お問い合わせへの対応</li>
        <li>お問い合わせ・不具合の調査のため、運営者が利用者の画面を利用者と同じ表示で確認すること（操作の記録を保存します）</li>
        <li>個人を特定できない形に加工した統計情報（時間帯別の人の流れ等）の作成と、事業者への集客分析の提供</li>
      </ul>
      <h2>3. 第三者提供</h2>
      <p>法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。紹介制度では、紹介元の事業者に、紹介で登録したお客さまのメールアドレスと登録日を表示します。</p>
      <h2>4. 業務委託先と外国にある事業者への提供</h2>
      <p>
        本サービスの運営のため、次の事業者に個人情報の取り扱いを委託しています。いずれも外国（アメリカ合衆国）の事業者で、個人情報は同国などのサーバーで保管・処理されます。
      </p>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-2">委託先</th>
            <th className="py-2 pr-2">所在国</th>
            <th className="py-2">委託する内容</th>
          </tr>
        </thead>
        <tbody>
          {PROCESSORS.map(([name, country, purpose]) => (
            <tr key={name} className="border-b align-top">
              <td className="py-2 pr-2 font-bold">{name}</td>
              <td className="py-2 pr-2">{country}</td>
              <td className="py-2">{purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul>
        <li>
          アメリカ合衆国には、日本の個人情報保護法に相当する包括的な連邦法はありませんが、州法（カリフォルニア州消費者プライバシー法など）や連邦取引委員会（FTC）による規制があります。各国の制度は、
          <a href="https://www.ppc.go.jp/personalinfo/legal/kaiseihogohou/#gaikoku" target="_blank" rel="noreferrer">
            個人情報保護委員会の調査資料
          </a>
          で確認できます。
        </li>
        <li>
          運営者は、各委託先が利用規約・データ処理契約で個人情報の安全管理措置（暗号化、アクセス制限、目的外利用の禁止等）を講じていることを確認したうえで委託しています。
        </li>
      </ul>
      <h2>5. 外部送信（利用者の端末から外部へ送信される情報）</h2>
      <p>本サービスでは、地図や画面の表示のため、利用者の端末から次の事業者へ情報が送信されます（電気通信事業法に基づく公表）。</p>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-2">送信先</th>
            <th className="py-2 pr-2">送信される情報</th>
            <th className="py-2">利用目的</th>
          </tr>
        </thead>
        <tbody>
          {EXTERNAL.map(([to, info, purpose]) => (
            <tr key={to} className="border-b align-top">
              <td className="py-2 pr-2 font-bold">{to}</td>
              <td className="py-2 pr-2">{info}</td>
              <td className="py-2">{purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        このほか、徒歩・車のルート検索では、運営者のサーバーから FOSSGIS e.V.（ドイツ。OpenStreetMap
        の道案内サーバーの運営団体）へ、出発地と立ち寄り先の緯度・経度のみを送信します（氏名・メールアドレス等は送信しません）。店舗住所の位置の特定には、国土地理院の住所検索を利用します。
      </p>
      <h2>6. 安全管理</h2>
      <p>通信の暗号化、パスワードのハッシュ化、アクセス権限の管理、操作記録の保存などにより、個人情報の漏えい等の防止に努めます。</p>
      <h2>7. 開示・訂正・削除等の請求</h2>
      <p>ご本人から個人情報の開示・訂正・利用停止・削除の請求があった場合は、本人確認のうえ、法令に従い対応します。下記の窓口までご連絡ください。</p>
      <h2>8. 改定</h2>
      <p>本ポリシーは必要に応じて改定し、本サービス上に掲示します。</p>
      <h2>9. お問い合わせ窓口</h2>
      <p>
        {OPERATOR.name}
        <br />
        所在地：{OPERATOR.address}
        <br />
        メール：{OPERATOR.email}
      </p>
    </LegalPage>
  );
}

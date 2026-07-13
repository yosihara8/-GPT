# 内面ブレーキ診断ツール - Googleフォーム連携セットアップ手順

`brake-diagnosis.html` は、診断結果と一緒に入力された企業情報を Google フォームへ送信する仕組みになっています。
Google フォームAPIはこのセッションのツールからは直接操作できないため、以下の手順を**手動で一度だけ**行ってください（所要時間 目安10分)。

## 0. 事前に作成済みのGoogleスプレッドシート

回答の保存先として、以下のスプレッドシートを作成済みです。手順2でこのシートにフォームの回答をリンクしてください。

- 内面ブレーキ診断_企業情報リスト
- https://docs.google.com/spreadsheets/d/1VxdCPVjtsT5AhN32P_Bz0WcAtiFO4Ig3APfITop2A64/edit

ヘッダー行（会社名／部署名／ご担当者名／メールアドレス／電話番号／利用目的への同意／診断結果タイプ／診断結果本文／送信日時）は入力済みです。

## 1. Googleフォームを作成する

[Googleフォーム](https://forms.google.com) で新規フォームを作成し、以下の項目を**この順番で**追加してください（種類はすべて「記述式」でOKです）。

| # | 質問文 | 種類 | 必須 |
|---|---|---|---|
| 1 | 会社名 | 記述式 | 必須 |
| 2 | 部署名 | 記述式 | 任意 |
| 3 | ご担当者名 | 記述式 | 任意 |
| 4 | メールアドレス | 記述式（回答の検証 → メールアドレス） | 必須 |
| 5 | 電話番号 | 記述式 | 任意 |
| 6 | 利用目的への同意 | 記述式 | 必須 |
| 7 | 診断結果タイプ | 記述式 | 必須 |
| 8 | 診断結果本文 | 記述式（段落） | 必須 |

※ 6〜8はツール側から自動入力される項目です（ユーザーには見せない運用でも構いません）。

## 2. 回答をスプレッドシートにリンクする

フォーム編集画面の「回答」タブ → 緑色のスプレッドシートアイコン →
「既存のスプレッドシートを選択」→ 手順0で作成済みの
「内面ブレーキ診断_企業情報リスト」を選択します。

## 3. entry ID を取得する

1. フォーム右上の「⋮」メニュー →「事前入力したリンクを取得」を選択
2. 各質問にダミー値（例: `TEST1`, `TEST2`…）を入力し「リンクを取得」
3. 発行されたURLをコピーし、`entry.123456789=TEST1&entry.987654321=TEST2...` のような
   パラメータから、どの `entry.XXXXXXXXX` がどの質問に対応するかを控えます

## 4. フォームの送信先URL（action URL）を確認する

手順3で取得したプレフィル用URLの末尾 `viewform` を `formResponse` に置き換えたものが送信先URLです。

```
変更前: https://docs.google.com/forms/d/e/XXXXXXXX/viewform?...
変更後: https://docs.google.com/forms/d/e/XXXXXXXX/formResponse
```

## 5. brake-diagnosis.html の設定を更新する

`brake-diagnosis.html` 内の `GOOGLE_FORM_CONFIG` を、手順3・4で取得した値に書き換えてください。

```js
const GOOGLE_FORM_CONFIG = {
  actionUrl: 'https://docs.google.com/forms/d/e/(あなたのフォームID)/formResponse',
  fields: {
    company: 'entry.(会社名のID)',
    department: 'entry.(部署名のID)',
    contactName: 'entry.(ご担当者名のID)',
    email: 'entry.(メールアドレスのID)',
    phone: 'entry.(電話番号のID)',
    consent: 'entry.(利用目的への同意のID)',
    resultType: 'entry.(診断結果タイプのID)',
    resultBody: 'entry.(診断結果本文のID)'
  }
};
```

設定後、実際にツールで診断→送信を行い、スプレッドシートに1行追加されることを確認してください。

## 6. 診断結果を自動でメール送信する（Apps Script）

Googleフォーム自体には回答者へ自動返信する機能がないため、フォームに紐づく
Apps Script で「フォーム送信時に回答者へメールを送る」処理を追加します。

1. フォーム編集画面の「⋮」メニュー →「スクリプトエディタ」を開く
2. 以下のコードを貼り付けて保存する

```javascript
function onFormSubmit(e) {
  var responses = e.namedValues; // { '質問文': ['回答'], ... }

  var email = responses['メールアドレス'] ? responses['メールアドレス'][0] : '';
  if (!email) return;

  var company = responses['会社名'] ? responses['会社名'][0] : '';
  var contactName = responses['ご担当者名'] ? responses['ご担当者名'][0] : '';
  var resultType = responses['診断結果タイプ'] ? responses['診断結果タイプ'][0] : '';
  var resultBody = responses['診断結果本文'] ? responses['診断結果本文'][0] : '';

  var greeting = contactName ? (contactName + ' 様') : (company + ' ご担当者様');
  var subject = '【内面ブレーキ診断】診断結果のご案内(' + resultType + ')';
  var body = greeting + '\n\n' +
    'この度は「内面ブレーキ診断」にご協力いただき誠にありがとうございます。\n' +
    '診断結果は以下の通りです。\n\n' +
    '■ 診断タイプ: ' + resultType + '\n\n' +
    resultBody + '\n\n' +
    '---\n' +
    '本メールは内面ブレーキ診断ツールからの自動送信です。\n' +
    '今後、本サービスに関するご案内をお送りする場合がございます。';

  MailApp.sendEmail(email, subject, body);
}
```

3. 左メニューの時計アイコン（トリガー）→「トリガーを追加」
   - 実行する関数: `onFormSubmit`
   - イベントのソース: `フォームから`
   - イベントの種類: `フォーム送信時`
   - 保存時にGoogleアカウントの権限承認（メール送信・フォーム読み取り）が求められるので許可する

以上で、診断ツールから送信 → スプレッドシートに企業情報がリスト化 → 回答者へ結果メールが自動送信、という一連の流れが完成します。

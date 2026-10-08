# SagaMap（サガマップ）MVP

**佐賀の個人事業主とお客さんを結ぶ、地理空間 AI 観光マップ**

集客に悩む個人事業主の店舗と観光客を地図上でマッチングし、位置情報 × AI 推薦で回遊性と売上を高めます。

- フロントエンド: Next.js 14（App Router）+ React + TypeScript + Tailwind CSS
- 地図: Google Maps JavaScript API（Maps / Directions / Distance Matrix / Visualization=Heatmap）
- バックエンド: Next.js API Routes（Node.js）
- DB: PostgreSQL + PostGIS（半径検索は `ST_DWithin`）
- AI 推薦: Node.js の簡易ハイブリッド推薦（ルールベース + アイテム協調フィルタリング）
- 認証: NextAuth.js（メール/パスワード、Google OAuth）
- 決済: Stripe（サブスクリプション・紹介割引による価格変更）
- メール: Resend（週 1 回の新着クーポン通知）

---

## セットアップ

```bash
cd sagamap
cp .env.example .env.local      # 値を設定
docker compose up -d            # PostGIS 起動（初回は schema.sql / seed.sql を自動投入）
npm install
npm run dev                     # http://localhost:3000
```

Docker を使わない場合は、PostGIS 入りの PostgreSQL を用意して `npm run db:init` を実行します。

### デモアカウント（seed.sql。パスワードはすべて `password123`）

| 種別 | メールアドレス | 内容 |
|---|---|---|
| 顧客 | `customer@example.com` | 閲覧・クーポン利用履歴あり |
| 事業主（有料） | `owner@example.com` | 「カフェ 栄の国」。紹介 7 名 / 目標 10 名 |
| 事業主（無料） | `free-owner@example.com` | 有料機能のロック表示を確認できます |

---

## Vercel で公開する

1. Vercel で GitHub リポジトリを Import し、**Root Directory を `sagamap`** にします。
2. Environment Variables に `NEXTAUTH_SECRET`、`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`、`GOOGLE_MAPS_SERVER_KEY`（デモデータを入れる場合は `SEED_DEMO_DATA=true`）を設定します。
3. Storage → Neon（Postgres）でデータベースを作成してプロジェクトに接続すると、`DATABASE_URL` が自動で設定されます。
4. デプロイ時に `vercel-build`（`scripts/migrate.mjs`）がスキーマを自動で適用します。
5. Google の「ブラウザ用キー」のウェブサイト制限に、Vercel のドメイン（例: `https://sagamap.vercel.app/*`）を追加します。

`NEXT_PUBLIC_APP_URL` と `NEXTAUTH_URL` は未設定でも、Vercel の本番ドメインが自動で使われます。独自ドメイン（sagamap.jp）を追加すると、そちらに切り替わります。週 1 回のメール通知は `vercel.json` の Cron（毎週月曜 9:00 JST）で実行されます。

## URL 一覧

ベース URL は `NEXT_PUBLIC_APP_URL`（既定 `https://sagamap.jp`）の 1 か所で変更できます。

### 画面

| パス | 内容 | ログイン |
|---|---|---|
| `/` | 店舗一覧の地図（赤ピン = 500m 以内のクーポン店、青ピン = 通常店舗） | 不要 |
| `/register/business` | 事業主登録（店舗名・住所・サービス内容・連絡先・業種・メール・パスワード） | 不要 |
| `/register/customer` | 顧客登録（名前・メール・パスワード・興味のある業種） | 不要 |
| `/login` | ログイン（お客さま / 事業主の切り替え、Google ログイン） | 不要 |
| `/ref?biz_id=123` | 紹介リンク。紹介元を Cookie に保存して顧客登録へ | 不要 |
| `/dashboard/customer` | 地図・近くの店舗・AI おすすめ（スワイプ）・クーポン検索・ルート提案・お知らせ | 顧客 |
| `/dashboard/customer/history` | 利用履歴（閲覧・クーポン利用） | 顧客 |
| `/dashboard/customer/coupons/[id]` | クーポン詳細（通知メールのリンク先） | 顧客 |
| `/dashboard/business` | 店舗情報編集・統計・「いつ・どこで」の分析・ヒートマップ | 事業主 |
| `/dashboard/business/coupons` | クーポン発行 | 事業主（有料） |
| `/dashboard/business/ads` | 広告出稿（地図上バナー） | 事業主（有料） |
| `/dashboard/business/referrals` | 紹介ダッシュボード（人数・QR・コピー・顧客一覧・割引状況） | 事業主（有料） |
| `/upgrade` | プラン変更（Stripe Checkout / カスタマーポータル） | 事業主 |
| `/unsubscribe?token=...` | メール配信停止 | 不要 |

### 外部サービスに登録する URL

| 用途 | URL |
|---|---|
| Stripe Webhook | `https://sagamap.jp/api/billing/webhook` |
| Stripe 決済成功時 | `https://sagamap.jp/dashboard/business?upgraded=1` |
| Stripe 決済キャンセル時 | `https://sagamap.jp/upgrade?canceled=1` |
| Google OAuth リダイレクト URI | `https://sagamap.jp/api/auth/callback/google` |
| 週次メール（Cron） | `GET https://sagamap.jp/api/cron/weekly-digest`（`Authorization: Bearer $CRON_SECRET`） |

---

## API

| メソッド・パス | 内容 | 権限 |
|---|---|---|
| `GET /api/businesses` | 店舗一覧（地図用・クーポン有無） | 公開 |
| `POST /api/businesses` | 店舗追加（無料プランは 1 店舗まで） | 事業主 |
| `GET /api/businesses/[id]` | 店舗詳細（顧客なら閲覧履歴を記録しクーポンも返す） | 公開 / 顧客 |
| `PATCH /api/businesses/[id]` | 店舗更新（SNS 連携は有料のみ） | 所有事業主 |
| `DELETE /api/businesses/[id]` | 店舗削除 | 所有事業主 |
| `GET /api/coupons` | 顧客: クーポン検索（`lat,lng,radius,category,price`）/ 事業主: 自店のクーポン | ログイン |
| `POST /api/coupons` | クーポン発行（割引率・有効期限・利用条件） | 事業主（有料） |
| `POST /api/coupons/[id]/use` | クーポン利用（利用履歴に記録） | 顧客 |
| `GET /api/search/nearby` | 半径検索（既定 500m、`radius=800` で徒歩 10 分）。距離・徒歩分数つき | 顧客 |
| `GET /api/recommend` | AI 推薦（`lat,lng,limit`） | 顧客 |
| `GET /api/referrals` | 紹介人数・紹介 URL・紹介顧客一覧・割引状況 | 事業主 |
| `POST /api/referrals` | 紹介元店舗の確認（登録画面の表示用） | 公開 |
| `POST /api/billing` | Stripe Checkout / カスタマーポータルの URL を発行 | 事業主 |
| `POST /api/billing/webhook` | Stripe Webhook（プラン反映・解約） | Stripe 署名 |
| `GET /api/heatmap?type=density` | 個人事業主の密度ヒートマップ | 公開 |
| `GET /api/heatmap?type=flow&hour=0-23` | 時間帯別の観光客の流れ（ダミー） | 公開 |
| `GET /api/stats` | 事業主の統計と「いつ・どこで」集客すべきか | 事業主 |
| `GET/POST/DELETE /api/ads` | 広告の配信取得・出稿・停止 | 公開 / 事業主（有料） |
| `GET /api/history` | 利用履歴 | 顧客 |
| `GET/PATCH /api/notifications` | お知らせ一覧・既読化 | 顧客 |
| `GET /api/spots` | 観光名所 | 公開 |
| `GET /api/me` | 事業主のプラン・所有店舗 | 事業主 |
| `GET /api/cron/weekly-digest` | 週次の新着クーポン通知（お知らせ作成 + メール送信） | `CRON_SECRET` |

---

## データベース

`db/schema.sql` を参照してください。

| テーブル | 主なカラム |
|---|---|
| `business_owners` | 事業主アカウント、`plan`（free/premium）、`monthly_price`、Stripe ID |
| `businesses` | 店舗: 名前・住所・`lat`/`lng`・`location`（PostGIS geography、自動生成）・業種・価格帯・混雑度・`is_premium`・SNS URL |
| `customers` | 顧客: 名前・メール・`interests`（興味業種）・通知設定 |
| `coupons` | 店舗 ID・割引率・有効期限・利用条件 |
| `referrals` | 店舗 ID・顧客 ID・登録日（1 顧客につき 1 件） |
| `usage_history` | 顧客 ID・店舗 ID・閲覧日時・クーポン利用フラグ |
| `ads` / `notifications` / `tourist_spots` | 広告・お知らせ・観光名所 |

---

## 仕組み

### 赤ピン / 青ピン
現在地から 500m 以内にあり、有効なクーポンを配信している店舗を赤ピン、それ以外を青ピンで表示します。サーバー側の判定は PostGIS の `ST_DWithin(location, 現在地, 500)` です。

### AI 推薦（`src/lib/recommend.ts`）
以下の要素を重み付きで合計したスコアで並べます。
| 要素 | 重み | 内容 |
|---|---|---|
| 業種の嗜好 | 0.30 | 閲覧 = 1、クーポン利用 = 3 を 14 日半減で重み付け + 登録時の興味業種 |
| 協調フィルタリング | 0.25 | 自分が見た店を見た他の人が訪れている店（アイテム共起） |
| 距離 | 0.15 | `exp(-距離 / 1.5km)` |
| 価格帯 | 0.10 | 履歴の平均価格帯との近さ |
| 混雑度 | 0.10 | 店舗の混雑度 × 時間帯別の人流（空いているほど高い） |
| クーポン | 0.10 | 有効なクーポンがあれば加点 |

直近 24 時間に見た店舗はスコアを半分にします。推薦理由（「よく見ている『カフェ』」など）をカードに表示します。

### 紹介割引
`/ref?biz_id=123` から登録した顧客を `referrals` に記録します。紹介人数が 10 名に達すると `monthly_price` を 2,980 円に更新します。Stripe サブスクリプションがあれば Price を `STRIPE_PRICE_DISCOUNT` に差し替えます（`proration_behavior: none`、次回請求から反映）。有料化する前に 10 名を達成していた場合も、Checkout 完了時に割引価格を適用します。

### 「いつ・どこで」集客すべきか
`src/lib/flows.ts` のダミーの人流データ（佐賀駅・佐賀城・唐人町・嬉野・有田・唐津・武雄）から、店舗の最寄りエリアで観光客が多い時間帯を出します。時間帯別の棒グラフと、時間帯を切り替えられる地図ヒートマップで表示します。実運用では人流データに置き換えてください。

---

## Google Maps Platform の注意

- **Directions API / Distance Matrix API** は Google 側で「レガシー」扱いになり、新しい Cloud プロジェクトでは有効化できない場合があります。その場合は Routes API（`computeRoutes` / `computeRouteMatrix`）への置き換えを検討してください。本 MVP では、Distance Matrix が使えないとき直線距離からの概算（`徒歩約○分`）を表示します。
- **Heatmap Layer**（`visualization` ライブラリ）は Google が非推奨を発表しています。使えない環境では、半透明の円を重ねる代替表示に自動で切り替わります。
- 店舗のピンは `google.maps.Marker` で描画しています。Map ID を設定して Advanced Markers に移行することもできます。
- ブラウザ用の API キーは HTTP リファラで `sagamap.jp/*` に制限してください。

---

## Stripe の設定

1. 月額 3,980 円と 2,980 円の Price（recurring / monthly / JPY）を作成し、`STRIPE_PRICE_STANDARD` と `STRIPE_PRICE_DISCOUNT` に設定します。
2. Webhook エンドポイント `https://sagamap.jp/api/billing/webhook` を追加し、次のイベントを選択します。
   `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`
3. カスタマーポータルを有効にします（解約・カード変更用）。

ローカルで試す場合: `stripe listen --forward-to localhost:3000/api/billing/webhook`

---

## MVP の範囲外・今後の課題

- 人流データ・混雑度はダミーです。
- 推薦はルールベースと協調フィルタリングの簡易版です（Python / FastAPI による学習モデルへの置き換えを想定）。
- 画像アップロード（店舗写真・広告画像）、パスワードリセット、メールアドレス確認、管理者画面は未実装です。

-- SagaMap データベーススキーマ（PostgreSQL 14+ / PostGIS 3+）
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 事業主アカウント（ログイン・プラン・決済情報）
CREATE TABLE IF NOT EXISTS business_owners (
  id                      SERIAL PRIMARY KEY,
  name                    TEXT NOT NULL,
  email                   TEXT NOT NULL UNIQUE,
  password_hash           TEXT NOT NULL,
  plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  monthly_price           INTEGER NOT NULL DEFAULT 3980,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 店舗（無料プランは 1 店舗まで。is_premium は所有者のプランと同期）
CREATE TABLE IF NOT EXISTS businesses (
  id                   SERIAL PRIMARY KEY,
  owner_id             INTEGER NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  address              TEXT NOT NULL,
  lat                  DOUBLE PRECISION NOT NULL,
  lng                  DOUBLE PRECISION NOT NULL,
  location             GEOGRAPHY(Point, 4326)
                         GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED,
  category             TEXT NOT NULL,
  service_description  TEXT NOT NULL DEFAULT '',
  contact              TEXT NOT NULL DEFAULT '',
  price_level          SMALLINT NOT NULL DEFAULT 2 CHECK (price_level BETWEEN 1 AND 3),
  crowd_level          SMALLINT NOT NULL DEFAULT 3 CHECK (crowd_level BETWEEN 1 AND 5),
  is_premium           BOOLEAN NOT NULL DEFAULT false,
  instagram_url        TEXT,
  twitter_url          TEXT,
  view_count           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS businesses_location_gix ON businesses USING GIST (location);
CREATE INDEX IF NOT EXISTS businesses_owner_idx ON businesses (owner_id);

-- 顧客
CREATE TABLE IF NOT EXISTS customers (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT,                       -- Google ログインのみの場合は NULL
  interests          TEXT[] NOT NULL DEFAULT '{}',
  notify_enabled     BOOLEAN NOT NULL DEFAULT true,
  unsubscribe_token  TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- クーポン
CREATE TABLE IF NOT EXISTS coupons (
  id             SERIAL PRIMARY KEY,
  business_id    INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  discount_rate  SMALLINT NOT NULL CHECK (discount_rate BETWEEN 1 AND 100),
  conditions     TEXT NOT NULL DEFAULT '',
  expires_at     TIMESTAMPTZ NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupons_business_idx ON coupons (business_id);

-- 紹介（1 顧客は 1 店舗からのみ紹介扱い。created_at = 登録日）
CREATE TABLE IF NOT EXISTS referrals (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referrals_business_idx ON referrals (business_id);

-- 利用履歴（閲覧・クーポン利用。AI 推薦の学習データ）
CREATE TABLE IF NOT EXISTS usage_history (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  coupon_id    INTEGER REFERENCES coupons(id) ON DELETE SET NULL,
  viewed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  coupon_used  BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS usage_history_customer_idx ON usage_history (customer_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS usage_history_business_idx ON usage_history (business_id);

-- 広告（有料プラン：地図上バナー）
CREATE TABLE IF NOT EXISTS ads (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  headline     TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at      TIMESTAMPTZ NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 顧客への通知（週 1 回のダイジェストで作成）
CREATE TABLE IF NOT EXISTS notifications (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  link         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notifications_customer_idx ON notifications (customer_id, created_at DESC);

-- 観光名所（ルート提案・距離計算用）
CREATE TABLE IF NOT EXISTS tourist_spots (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL
);

-- 運営者（管理画面 /admin）
CREATE TABLE IF NOT EXISTS admins (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 運営者の操作記録（削除・プラン変更など）
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target      TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 試行回数の制限（ログイン・登録の総当たり攻撃対策）
CREATE TABLE IF NOT EXISTS rate_limits (
  key           TEXT PRIMARY KEY,
  count         INTEGER NOT NULL DEFAULT 0,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- メール確認・パスワード再設定用のトークン（トークン本体はハッシュで保存）
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          BIGSERIAL PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('reset_password', 'verify_email')),
  role        TEXT NOT NULL CHECK (role IN ('business', 'customer', 'admin')),
  user_id     INTEGER NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- メールアドレスの確認日時
ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- 店舗写真（縮小した JPEG を保存）
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS photo BYTEA;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS photo_type TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS photo_updated_at TIMESTAMPTZ;

-- エラーの記録（運営者が管理画面で確認）
CREATE TABLE IF NOT EXISTS error_logs (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  message     TEXT NOT NULL,
  stack       TEXT,
  url         TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- お知らせの種類（weekly = 週 1 回のまとめ、coupon / ad = 事業者の発信時の自動お知らせ）
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'weekly';
CREATE INDEX IF NOT EXISTS notifications_kind_idx ON notifications (customer_id, kind, created_at DESC);

-- 定期処理の実行記録（週 1 回のメールを二重に送らないため）
CREATE TABLE IF NOT EXISTS job_runs (
  job         TEXT NOT NULL,
  period      TEXT NOT NULL,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  result      TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (job, period)
);

-- お気に入りの店舗（お客さま）
CREATE TABLE IF NOT EXISTS favorites (
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, business_id)
);

-- 地図を開いた場所と時刻（匿名。誰の記録かは保存しない。約 100m 単位に丸めて保存）
CREATE TABLE IF NOT EXISTS location_pings (
  id          BIGSERIAL PRIMARY KEY,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS location_pings_created_idx ON location_pings (created_at);

-- 紹介割引の月次判定の記録（前月の紹介人数と、当月の料金）
CREATE TABLE IF NOT EXISTS referral_monthly_results (
  owner_id       INTEGER NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  month          DATE NOT NULL,          -- 紹介を数えた月（1 日）
  referral_count INTEGER NOT NULL,
  achieved       BOOLEAN NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, month)
);

-- 管理者の代理ログイン用トークンを許可
ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('reset_password', 'verify_email', 'impersonate'));

-- 特別招待コード（運営者の紹介者は有料プランを無料で利用できる）
CREATE TABLE IF NOT EXISTS invite_codes (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL DEFAULT '',
  max_uses    INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count  INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 特別プラン（有料機能を無料で利用。Stripe の請求なし）
ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS complimentary BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS invite_code_id INTEGER REFERENCES invite_codes(id) ON DELETE SET NULL;

-- クーポン・広告の自動チェック（要確認の理由。空なら問題なし。運営者が確認すると reviewed_at が入る）
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS review_flags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS review_flags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 運営者は 1 人だけ（2 人目は登録できない）。既に複数いる場合は作らない（ビルドを止めないため）
DO $$
BEGIN
  IF (SELECT count(*) FROM admins) <= 1 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS admins_only_one ON admins ((true));
  END IF;
END $$;

-- 広告の画像（任意。ブラウザで縮小した JPEG）
ALTER TABLE ads ADD COLUMN IF NOT EXISTS image BYTEA;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS image_type TEXT;

-- クーポンの画像（任意）と削除（利用履歴を残すため、行は消さずに deleted_at を入れる）
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS image BYTEA;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS image_type TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 広告の表示・タップの記録（お客さまが広告を見たかの統計）
CREATE TABLE IF NOT EXISTS ad_events (
  id           BIGSERIAL PRIMARY KEY,
  ad_id        INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('view', 'click')),
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_events_ad_idx ON ad_events (ad_id, kind);
ALTER TABLE ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 解約手続き済みの有料プランが終わる日（それまでは有料プランのまま使える）
ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS plan_ends_at TIMESTAMPTZ;

-- 営業時間・定休日（事業主が自由に入力。例「11:00〜20:00」「水曜日」）
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_hours TEXT NOT NULL DEFAULT '';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS closed_days TEXT NOT NULL DEFAULT '';

-- お客さまの「行動」の記録（事業主向けの統計：経路を調べた・電話した・保存した・共有した・クーポンを見た）
CREATE TABLE IF NOT EXISTS shop_events (
  id           BIGSERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('route', 'call', 'save', 'share', 'coupon_view')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_events_biz_idx ON shop_events (business_id, kind, created_at);

-- クーポンの種類（％引き・円引き・特別価格・特典サービス）と使い方の設定
ALTER TABLE coupons ALTER COLUMN discount_rate DROP NOT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_type TEXT NOT NULL DEFAULT 'percent';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS amount_yen INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS special_price INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS regular_price INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS benefit TEXT NOT NULL DEFAULT '';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS repeatable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS first_visit_only BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE coupons ADD CONSTRAINT coupons_type_check CHECK (coupon_type IN ('percent', 'yen', 'price', 'gift'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- メニュー・商品（写真・価格つき。お店のページに表示）
CREATE TABLE IF NOT EXISTS menu_items (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  price        INTEGER,
  description  TEXT NOT NULL DEFAULT '',
  image        BYTEA,
  image_type   TEXT,
  sort         INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_items_biz_idx ON menu_items (business_id, sort, id);

-- お店の特徴（駐車場・カード払いなど）と、予約・ホームページ・LINE のリンク
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS amenities TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reservation_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS line_url TEXT;

-- SNS（Threads・Facebook）
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS threads_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- 営業カレンダー: 曜日ごとの営業時間（日曜=0〜土曜=6。[["11:00","14:00"],["17:00","22:00"]] 等。空の配列は定休日）と補足
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS weekly_hours JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hours_note TEXT NOT NULL DEFAULT '';
-- 臨時休業・特別営業の日
CREATE TABLE IF NOT EXISTS business_days (
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day          DATE NOT NULL,
  closed       BOOLEAN NOT NULL DEFAULT true,
  ranges       JSONB,
  note         TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (business_id, day)
);

-- お支払い方法（クレジットカード・バーコード決済・交通系IC・電子マネー）。payment_none は「使えない」と選んだ種類
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_methods TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_none TEXT[] NOT NULL DEFAULT '{}';

-- お店の写真（外観・店内・客席・商品など。お店のページで横にスライドして見る）
CREATE TABLE IF NOT EXISTS business_photos (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'その他',
  caption      TEXT NOT NULL DEFAULT '',
  image        BYTEA NOT NULL,
  image_type   TEXT NOT NULL DEFAULT 'image/jpeg',
  sort         INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_photos_biz_idx ON business_photos (business_id, sort, id);

-- ログインの無効化（パスワード変更・「すべての端末からログアウト」で番号を上げると、古いログインは使えなくなる）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
-- 運営者の二段階認証（認証アプリの 6 桁の数字）
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_last_step BIGINT;

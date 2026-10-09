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

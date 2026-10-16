// デプロイ時（vercel-build）に実行: スキーマを適用し、必要ならデモデータを投入する。
// schema.sql は IF NOT EXISTS で書かれているため、何度実行しても安全。
import { readFile } from "node:fs/promises";
import pg from "pg";

const env = process.env;
// Vercel の Neon 連携は接頭辞によって変数名が変わるため、よく使われる名前を順に探す
const url =
  env.DATABASE_URL || env.POSTGRES_URL || env.STORAGE_URL || env.STORAGE_DATABASE_URL || env.STORAGE_POSTGRES_URL;
if (!url) {
  console.warn("[migrate] DATABASE_URL が未設定のため、DB の初期化をスキップしました");
  process.exit(0);
}

const INITIAL_ADMIN = {
  email: "yosihara9@gmail.com",
  passwordHash: "$2a$12$.rwQfxo3Qtx3pTbKby3QX.eOwndihFo98D3zs3yzWYwvmxWo4vsYK",
};

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("[migrate] schema.sql を適用しました");

  // 運営者（サイトのオーナー）。初期パスワードはログイン後に管理画面で変更する
  const owner = await client.query(
    `INSERT INTO admins (name, email, password_hash)
     SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM admins)`,
    ["サイト運営者", INITIAL_ADMIN.email, INITIAL_ADMIN.passwordHash],
  );
  if (owner.rowCount) console.log("[migrate] 運営者アカウントを作成しました");

  // 緊急用：運営者のパスワードを Vercel の環境変数から決め直す（メールもスマホも使えないとき）。
  // ADMIN_RECOVERY_PASSWORD（12 文字以上）を入れて再デプロイすると、1 回だけ反映し、二段階認証も解除する。
  // ADMIN_RECOVERY_EMAIL を入れると、運営者のメールアドレスも変える。反映後は環境変数を必ず消す。
  const rec = env.ADMIN_RECOVERY_PASSWORD;
  if (rec) {
    if (rec.length < 12) {
      console.warn("[migrate] ADMIN_RECOVERY_PASSWORD は 12 文字以上にしてください（反映していません）");
    } else {
      const { createHash } = await import("node:crypto");
      const bcrypt = (await import("bcryptjs")).default;
      const mark = createHash("sha256").update(`${rec}\n${env.ADMIN_RECOVERY_EMAIL ?? ""}`).digest("hex").slice(0, 32);
      const claimed = await client.query("INSERT INTO job_runs (job, period) VALUES ('admin-recovery', $1) ON CONFLICT DO NOTHING RETURNING period", [mark]);
      if (claimed.rowCount) {
        const email = env.ADMIN_RECOVERY_EMAIL?.trim().toLowerCase();
        await client.query(
          `UPDATE admins SET password_hash = $1, session_version = session_version + 1,
                  totp_secret = NULL, totp_enabled_at = NULL, totp_last_step = NULL${email ? ", email = $2" : ""}`,
          email ? [await bcrypt.hash(rec, 12), email] : [await bcrypt.hash(rec, 12)],
        );
        await client.query("DELETE FROM rate_limits WHERE key LIKE 'admin-login%'");
        console.log("[migrate] 運営者のパスワードを緊急用の設定で決め直しました。Vercel の ADMIN_RECOVERY_PASSWORD を消してください");
      }
    }
  }

  // 観光名所（実在の場所）は空なら投入
  const spots = await client.query("SELECT count(*)::int AS n FROM tourist_spots");
  if (spots.rows[0].n === 0) {
    await client.query(await readFile(new URL("../db/spots.sql", import.meta.url), "utf8"));
    console.log("[migrate] 観光名所（spots.sql）を投入しました");
  }

  // 観光スポット・宿・交通の基本情報（名前が無いものだけ追加）と、住所からの緯度経度の求め直し
  await client.query(await readFile(new URL("../db/listings.sql", import.meta.url), "utf8"));
  await geocodeSpots(client);

  if (process.env.SEED_DEMO_DATA === "true") {
    // 動作確認用: DB が空なら架空の店舗・デモアカウントを投入
    const { rows } = await client.query("SELECT count(*)::int AS n FROM business_owners");
    if (rows[0].n === 0) {
      await client.query(await readFile(new URL("../db/seed.sql", import.meta.url), "utf8"));
      console.log("[migrate] デモデータ（seed.sql）を投入しました");
    }
  } else {
    // 本番: デモデータ（@example.com のアカウントとその店舗・クーポン・広告）を削除
    const owners = await client.query("DELETE FROM business_owners WHERE email LIKE '%@example.com'");
    const customers = await client.query("DELETE FROM customers WHERE email LIKE '%@example.com'");
    if (owners.rowCount || customers.rowCount) {
      console.log(`[migrate] デモデータを削除しました（事業主 ${owners.rowCount} 件・顧客 ${customers.rowCount} 件）`);
    }
  }
} finally {
  await client.end();
}

/**
 * geocoded = false の観光スポット・宿などの緯度経度を、住所から求め直す。
 * Google（GOOGLE_MAPS_SERVER_KEY がある場合）→ 国土地理院の順。仮の位置から 10km 以上離れた結果は採らない。
 * 求められなかった行は仮の位置のまま残し、次のデプロイでもう一度試す。
 */
async function geocodeSpots(db) {
  const { rows } = await db.query("SELECT id, name, kind, address, lat, lng FROM tourist_spots WHERE NOT geocoded AND address IS NOT NULL ORDER BY id LIMIT 100");
  if (!rows.length) return;
  const near = (a, b) => {
    const k = Math.PI / 180;
    const x = (b.lng - a.lng) * k * Math.cos(((a.lat + b.lat) / 2) * k);
    const y = (b.lat - a.lat) * k;
    return Math.sqrt(x * x + y * y) * 6371000 < 10000;
  };
  const google = async (q) => {
    if (!env.GOOGLE_MAPS_SERVER_KEY) return null;
    const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    u.searchParams.set("address", q);
    u.searchParams.set("region", "jp");
    u.searchParams.set("language", "ja");
    u.searchParams.set("key", env.GOOGLE_MAPS_SERVER_KEY);
    const d = await (await fetch(u, { signal: AbortSignal.timeout(5000) })).json();
    const loc = d?.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  };
  const gsi = async (q) => {
    const u = new URL("https://msearch.gsi.go.jp/address-search/AddressSearch");
    u.searchParams.set("q", q);
    const d = await (await fetch(u, { signal: AbortSignal.timeout(5000) })).json();
    const c = Array.isArray(d) ? d[0]?.geometry?.coordinates : null;
    return c ? { lat: Number(c[1]), lng: Number(c[0]) } : null;
  };
  let done = 0;
  // デプロイが長引かないよう、全体で 90 秒まで（残りは次のデプロイで）
  const until = Date.now() + 90_000;
  for (const r of rows) {
    if (Date.now() > until) break;
    // 観光スポットは名前で探すほうが正確（住所は大字までのものがある）。宿などは番地まで分かる住所で探す
    const tries = r.kind === "sight" ? [() => google(`${r.address} ${r.name}`), () => gsi(r.address)] : [() => google(r.address), () => gsi(r.address)];
    for (const t of tries) {
      try {
        const p = await t();
        if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && near(r, p)) {
          await db.query("UPDATE tourist_spots SET lat = $1, lng = $2, geocoded = true WHERE id = $3", [p.lat, p.lng, r.id]);
          done += 1;
          break;
        }
      } catch {
        /* 次の方法で試す */
      }
    }
  }
  console.log(`[migrate] 観光スポット・宿などの位置を住所から求めました（${done} / ${rows.length} 件）`);
}

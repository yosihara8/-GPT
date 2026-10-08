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

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("[migrate] schema.sql を適用しました");

  // 観光名所（実在の場所）は空なら投入
  const spots = await client.query("SELECT count(*)::int AS n FROM tourist_spots");
  if (spots.rows[0].n === 0) {
    await client.query(await readFile(new URL("../db/spots.sql", import.meta.url), "utf8"));
    console.log("[migrate] 観光名所（spots.sql）を投入しました");
  }

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

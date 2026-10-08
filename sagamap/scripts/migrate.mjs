// デプロイ時（vercel-build）に実行: スキーマを適用し、必要ならデモデータを投入する。
// schema.sql は IF NOT EXISTS で書かれているため、何度実行しても安全。
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("[migrate] DATABASE_URL が未設定のため、DB の初期化をスキップしました");
  process.exit(0);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("[migrate] schema.sql を適用しました");

  if (process.env.SEED_DEMO_DATA === "true") {
    const { rows } = await client.query("SELECT count(*)::int AS n FROM business_owners");
    if (rows[0].n === 0) {
      await client.query(await readFile(new URL("../db/seed.sql", import.meta.url), "utf8"));
      console.log("[migrate] デモデータ（seed.sql）を投入しました");
    } else {
      console.log("[migrate] データが既にあるため、デモデータの投入はスキップしました");
    }
  }
} finally {
  await client.end();
}

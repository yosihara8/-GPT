import { Pool, type QueryResultRow } from "pg";
import { DATABASE_URL } from "./config";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

/**
 * Neon は「接続プール用の入口（-pooler）」を使うと、同時に数千の接続を受けられる。
 * アクセスが増えると Vercel の関数が何十台も同時に動き、直接の入口では接続数の上限に当たるため、
 * アプリからは自動でプール用の入口につなぐ（DB の設定変更 scripts/migrate.mjs は直接の入口のまま）。
 */
export function pooledUrl(url: string | undefined) {
  if (!url || process.env.DATABASE_DIRECT === "true") return url;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(".neon.tech") || u.hostname.includes("-pooler.")) return url;
    const [endpoint, ...rest] = u.hostname.split(".");
    u.hostname = [`${endpoint}-pooler`, ...rest].join(".");
    return u.toString();
  } catch {
    return url;
  }
}

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: pooledUrl(DATABASE_URL),
    // 1 台の関数が持つ接続は少なめに（台数が増えても DB があふれないように）
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    // 1 つの問い合わせを 20 秒待っても返らなければあきらめる（詰まって全体が遅くなるのを防ぐ）。
    // statement_timeout は接続プール（PgBouncer）が受け付けないため、アプリ側で打ち切る
    query_timeout: 20_000,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

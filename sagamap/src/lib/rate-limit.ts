import { query, queryOne } from "./db";

/**
 * 固定ウィンドウ方式の試行回数制限（サーバーレスでも共有できるよう DB に記録）。
 * limit 回を超えたら ok: false と、あと何秒で解除されるかを返す。
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const row = await queryOne<{ count: number; retry_after: number }>(
    `INSERT INTO rate_limits (key, count, window_start) VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limits.window_start END
     RETURNING count, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => $2) - now())))::int AS retry_after`,
    [key, windowSec],
  );
  // 古い記録をときどき掃除する
  if (Math.random() < 0.01) await query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
  return { ok: (row?.count ?? 0) <= limit, retryAfter: Math.max(1, row?.retry_after ?? windowSec) };
}

/** 成功したログインなどで制限をリセットする */
export async function resetRateLimit(key: string) {
  await query("DELETE FROM rate_limits WHERE key = $1", [key]);
}

type HeaderSource = Headers | Record<string, string | string[] | undefined> | undefined;

/** 接続元 IP（Vercel では x-forwarded-for の先頭） */
export function clientIp(headers: HeaderSource) {
  const get = (name: string) => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  return (get("x-forwarded-for")?.split(",")[0] ?? get("x-real-ip") ?? "unknown").trim();
}

export function tooManyRequestsMessage(retryAfterSec: number) {
  const min = Math.ceil(retryAfterSec / 60);
  return `試行回数が多すぎます。${min} 分ほど待ってから、もう一度お試しください`;
}

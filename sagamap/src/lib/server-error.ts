import { query } from "./db";

/** サーバー側のエラーを記録する（記録自体の失敗は無視） */
export async function logServerError(where: string, e: unknown) {
  console.error(`[${where}]`, e);
  try {
    const err = e instanceof Error ? e : new Error(String(e));
    await query("INSERT INTO error_logs (source, message, stack, url) VALUES ('server', $1, $2, $3)", [
      err.message.slice(0, 1000),
      err.stack?.slice(0, 4000) ?? null,
      where.slice(0, 500),
    ]);
  } catch {
    /* noop */
  }
}

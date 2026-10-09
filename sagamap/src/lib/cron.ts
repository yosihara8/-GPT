import { queryOne, query } from "./db";

/** Vercel Cron からの呼び出しか（CRON_SECRET があればそれで確認） */
export function isCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET;
  return secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron");
}

/** 同じ期間に 1 回だけ実行する。実行できたら true */
export async function claimJob(job: string, period: string) {
  const row = await queryOne("INSERT INTO job_runs (job, period) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING period", [job, period]);
  return Boolean(row);
}

export async function finishJob(job: string, period: string, result: unknown) {
  await query("UPDATE job_runs SET result = $1 WHERE job = $2 AND period = $3", [JSON.stringify(result), job, period]);
}

/** 失敗したら記録を消して、再実行できるようにする */
export async function releaseJob(job: string, period: string) {
  await query("DELETE FROM job_runs WHERE job = $1 AND period = $2", [job, period]);
}

/** 日本時間の年月（例: 2026-10） */
export function jstMonth(d = new Date()) {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 7);
}

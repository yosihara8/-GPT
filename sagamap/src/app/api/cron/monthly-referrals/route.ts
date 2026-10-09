import { NextResponse } from "next/server";
import { claimJob, finishJob, isCronRequest, jstMonth, releaseJob } from "@/lib/cron";
import { applyMonthlyReferralPricing } from "@/lib/referral";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 紹介割引の月次判定。Vercel Cron が毎日 0:10（日本時間）に呼び出し、各月の最初の 1 回だけ実行する。
 * 前月（1 日〜末日）の紹介が 10 名以上なら、今月の月額を 2,980 円にする。
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const period = jstMonth();
  if (!(await claimJob("monthly-referrals", period))) {
    return NextResponse.json({ skipped: true, reason: `${period} の判定は実行済みです` });
  }
  try {
    const result = await applyMonthlyReferralPricing();
    await finishJob("monthly-referrals", period, result);
    return NextResponse.json({ period, ...result });
  } catch (e) {
    await releaseJob("monthly-referrals", period);
    await logServerError("cron/monthly-referrals", e);
    throw e;
  }
}

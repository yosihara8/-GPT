import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { FLOW_DAYS, MIN_SAMPLES, areaRankingByHour, hourlyCountsNear, nearestArea } from "@/lib/flows";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 店舗の周辺として数える範囲（m） */
const NEAR_M = 1000;

/**
 * 事業主ダッシュボード: 基本統計 + 「いつ・どこで」集客すべきか。
 * 時間帯のデータは、SagaMap 利用者の実測（店舗周辺 1km で地図を開いた件数 + 店舗ページの閲覧数・直近 30 日）。
 */
export async function GET() {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;

  const stores = await query<{
    id: number;
    name: string;
    lat: number;
    lng: number;
    view_count: number;
    coupon_uses: number;
    views_7d: number;
  }>(
    `SELECT b.id, b.name, b.lat, b.lng, b.view_count,
            (SELECT count(*) FROM usage_history h WHERE h.business_id = b.id AND h.coupon_used)::int AS coupon_uses,
            (SELECT count(*) FROM usage_history h WHERE h.business_id = b.id AND h.viewed_at > now() - interval '7 days')::int AS views_7d
       FROM businesses b WHERE b.owner_id = $1 ORDER BY b.id`,
    [auth.user.id],
  );

  const insights = await Promise.all(
    stores.map(async (s) => {
      const near = await hourlyCountsNear(s.lat, s.lng, NEAR_M);
      const views = await query<{ h: number; n: number }>(
        `SELECT EXTRACT(HOUR FROM viewed_at AT TIME ZONE 'Asia/Tokyo')::int AS h, count(*)::int AS n
           FROM usage_history WHERE business_id = $1 AND viewed_at > now() - make_interval(days => $2) GROUP BY 1`,
        [s.id, FLOW_DAYS],
      );
      const hourly = [...near];
      for (const v of views) hourly[v.h] += v.n;
      const total = hourly.reduce((a, b) => a + b, 0);
      const collecting = total < MIN_SAMPLES;
      const peakHours = collecting
        ? []
        : hourly
            .map((v, h) => ({ h, v }))
            .sort((a, b) => b.v - a.v)
            .slice(0, 3)
            .map((r) => r.h)
            .sort((a, b) => a - b);
      const area = nearestArea(s.lat, s.lng);
      return {
        businessId: s.id,
        area,
        hourly,
        total,
        collecting,
        peakHours,
        advice: collecting
          ? `データを集めています（直近 ${FLOW_DAYS} 日で ${total} 件 / 目安 ${MIN_SAMPLES} 件）。SagaMap の利用者が増えると、時間帯ごとの傾向が表示されます。`
          : `お店の周辺では ${peakHours.map((h) => `${h}時`).join("・")} 頃に SagaMap の利用者が多くなっています。その 1 時間前にクーポンや広告を出すと効果的です。`,
      };
    }),
  );

  return NextResponse.json({ stores, insights, areaRanking: await areaRankingByHour(), days: FLOW_DAYS });
}

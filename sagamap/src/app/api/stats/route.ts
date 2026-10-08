import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { FLOW_AREAS } from "@/lib/flows";
import { haversineMeters } from "@/lib/geo";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 事業主ダッシュボード: 基本統計 + 「いつ・どこで」集客すべきか */
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

  const insights = stores.map((s) => {
    const nearest = FLOW_AREAS.map((a) => ({ a, d: haversineMeters(s, a) })).sort((x, y) => x.d - y.d)[0];
    const hourly = nearest.a.hourly;
    const ranked = hourly.map((v, h) => ({ h, v })).sort((x, y) => y.v - x.v);
    const peakHours = ranked.slice(0, 3).map((r) => r.h).sort((a, b) => a - b);
    return {
      businessId: s.id,
      area: nearest.a.name,
      hourly: hourly.map((v) => Math.round(v * 100)),
      peakHours,
      advice: `${nearest.a.name}は ${peakHours.map((h) => `${h}時`).join("・")} 頃に観光客が多くなります。その 1 時間前にクーポンや広告を配信すると効果的です。`,
    };
  });

  // 「どこで」: 時間帯ごとに人が多いエリア
  const areaRanking = Array.from({ length: 24 }, (_, h) =>
    FLOW_AREAS.map((a) => ({ area: a.name, value: Math.round(a.hourly[h] * 100) }))
      .sort((x, y) => y.value - x.value)
      .slice(0, 3),
  );

  return NextResponse.json({ stores, insights, areaRanking });
}

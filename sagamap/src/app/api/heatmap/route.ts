import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { FLOW_DAYS, MIN_SAMPLES, flowPoints } from "@/lib/flows";

export const dynamic = "force-dynamic";

/**
 * ヒートマップ用データ
 *  ?type=density : 個人事業主の密度（店舗位置。閲覧数で重み付け）
 *  ?type=flow&hour=0-23 : 時間帯別の利用者の流れ（SagaMap 利用者の実測・直近 30 日）
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get("type") === "flow") {
    const hour = Math.min(23, Math.max(0, Number(sp.get("hour") ?? 12) || 0));
    const points = await flowPoints(hour);
    const total = points.reduce((s, p) => s + p.count, 0);
    return NextResponse.json({ hour, days: FLOW_DAYS, total, collecting: total < MIN_SAMPLES, points });
  }
  const rows = await query<{ lat: number; lng: number; view_count: number }>(
    "SELECT lat, lng, view_count FROM businesses",
  );
  const max = Math.max(1, ...rows.map((r) => r.view_count));
  return NextResponse.json({
    points: rows.map((r) => ({ lat: r.lat, lng: r.lng, weight: 1 + (4 * r.view_count) / max })),
  });
}

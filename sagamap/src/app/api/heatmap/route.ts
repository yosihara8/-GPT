import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { touristFlowPoints } from "@/lib/flows";

export const dynamic = "force-dynamic";

/**
 * ヒートマップ用データ
 *  ?type=density : 個人事業主の密度（店舗位置。閲覧数で重み付け）
 *  ?type=flow&hour=0-23 : 時間帯別の観光客の流れ（ダミー）
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get("type") === "flow") {
    const hour = Math.min(23, Math.max(0, Number(sp.get("hour") ?? 12) || 0));
    return NextResponse.json({ hour, points: touristFlowPoints(hour) });
  }
  const rows = await query<{ lat: number; lng: number; view_count: number }>(
    "SELECT lat, lng, view_count FROM businesses",
  );
  const max = Math.max(1, ...rows.map((r) => r.view_count));
  return NextResponse.json({
    points: rows.map((r) => ({ lat: r.lat, lng: r.lng, weight: 1 + (4 * r.view_count) / max })),
  });
}

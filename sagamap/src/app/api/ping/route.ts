import { NextResponse } from "next/server";
import { recordLocationPing } from "@/lib/flows";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * 地図を開いた場所の記録（匿名・約 100m 単位。人の流れの実測に使う）。
 * 同じ接続元からは 10 分に 1 回だけ記録する。
 */
export async function POST(req: Request) {
  const rl = await rateLimit(`ping:${clientIp(req.headers)}`, 1, 10 * 60);
  if (!rl.ok) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { lat?: unknown; lng?: unknown } | null;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) await recordLocationPing(lat, lng);
  return new NextResponse(null, { status: 204 });
}

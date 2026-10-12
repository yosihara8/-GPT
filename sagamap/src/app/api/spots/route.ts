import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 観光名所（ルート提案・距離計算用） */
export async function GET() {
  const spots = await query("SELECT id, name, description, lat, lng FROM tourist_spots ORDER BY id");
  return NextResponse.json({ spots }, { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } });
}

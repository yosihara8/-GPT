import { NextResponse, type NextRequest } from "next/server";
import { parseLatLng } from "@/lib/geo";
import { recommendForCustomer } from "@/lib/recommend";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** AI 推薦: GET /api/recommend?lat=&lng=&limit= */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 10) || 10, 30);
  const recommendations = await recommendForCustomer(auth.user.id, parseLatLng(sp), limit);
  return NextResponse.json({ recommendations });
}
